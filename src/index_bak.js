import pkg from '../package.json';
const __version = pkg.version;

import 'regenerator-runtime/runtime.js';

import * as THREE from 'three';
import cover from '@mapbox/tile-cover';
import RgbModel from './models/rgb.js';
import Utils from './utils.js';
import Laser from 'three-laser-pointer/src';

// import Elevation from './elevation.js'; // WIP ?
const Elevation = {resolveElevation: () => undefined}; // dummy for now

class ThreeGeo {
    constructor(opts={}) {
        this.version = __version;
        console.info(`ThreeGeo ${__version} with THREE r${THREE.REVISION}`);

        const defaults = {
            unitsSide: 1.0,
            tokenMapbox: '',
            isNode: false,
            isDebug: false,
            apiVector: 'mapbox-terrain-vector',
            apiRgb: 'mapbox-terrain-rgb',
            apiSatellite: 'mapbox-satellite',
        };

        const actual = Object.assign({}, defaults, opts);
        this.constUnitsSide = actual.unitsSide;
        this.tokenMapbox = actual.tokenMapbox;
        this.isNode = /* legacy */ actual.useNodePixels || actual.isNode;
        this.isDebug = actual.isDebug;
        this.apiVector = actual.apiVector;
        this.apiRgb = actual.apiRgb;
        this.apiSatellite = actual.apiSatellite;

        if (this.isDebug) {
            console.warn('`isDebug` is true; terrains support `.userData.debug()`.');
        }
    }

    // 计算每米的单位数 unitsSide=1.0 radius为5时的 0.00014142135623730948
    static _getUnitsPerMeter(unitsSide, radius) {
        return unitsSide / (radius * Math.pow(2, 0.5) * 1000);
    }

    // 计算项目坐标.  需要具体测试有什么作用。
    static _projectCoord(unitsSide, coord, nw, se) {
        return [ // lng, lat -> px, py
            unitsSide * (-0.5 + (coord[0]-nw[0]) / (se[0]-nw[0])),
            unitsSide * (-0.5 - (coord[1]-se[1]) / (se[1]-nw[1]))
        ];
    }

    // ll-notation
    //   latlng: three-geo, leaflet
    //   lnglat: turf
    getProjection(origin, radius, unitsSide=this.constUnitsSide) {
        const wsen = Utils.originRadiusToBbox(origin, radius); // wsen 就是四个角的经纬度。
        const _unitsPerMeter = ThreeGeo._getUnitsPerMeter(unitsSide, radius);
        return {
            proj: (latlng, meshes=undefined) => // `meshes`: rgbDem
                ThreeGeo._proj(latlng, meshes, wsen, unitsSide),
            projInv: (x, y) =>
                ThreeGeo._projInv(x, y, origin, _unitsPerMeter), // latlng
            bbox: wsen,
            unitsPerMeter: _unitsPerMeter,
        };
    }

    static _proj(ll, meshes, wsen, unitsSide) {
        const [lat, lng] = ll;
        const [w, s, e, n] = wsen;

        // [x, y, z]: terrain coordinates
        const [x, y] = this._projectCoord(
            unitsSide, [lng, lat], [w, n], [e, s]);

        // WIP (undocumented API): Resolve `z` (elevation) in case the optional `meshes` is provided.
        const z = meshes ?
            Elevation.resolveElevation(x, y, lat, lng, meshes) : // 'maybe' `undefined`
            undefined;

        return z !== undefined ? [x, y, z] : [x, y];
    }

    static _projInv(x, y, origin, unitsPerMeter) {
        const ll = Utils.translateTurfObject(Utils.createTurfPoint(origin),
            x, y, 0, unitsPerMeter).geometry.coordinates; // lnglat
        return [ll[1], ll[0]]; // latlng
    }

    // Zoom extent - https://www.mapbox.com/studio/tilesets/
    //   satellite:  z0 ~ z22
    //   rgb dem:    z0 ~ z15
    //   vector dem: z0 ~ z15
    static getZoomposCovered(polygon, zoom) { // isochrone polygon
        // https://www.mapbox.com/vector-tiles/mapbox-terrain/#contour
        //   Zoom   Contour Interval
        //      9   500 meters
        //     10   200 meters
        //     11   100 meters
        //     12    50 meters
        //     13    20 meters
        //     14+   10 meters
        let limits = {
            min_zoom: zoom,
            max_zoom: zoom,
        };
        // 计算在该经纬度、缩放级别下box的瓦片位置
        return cover.tiles(polygon.geometry, limits) // poszoom
            .map(([x, y, z]) => [z, x, y]); // zoompos now!!
    }

    // 根据经纬度和视角高度 获取该视角下盒子的东南西北的位置。
    static getBbox(origin, radius) {
        const testPolygon = {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[]]
                }
            }]
        };
        const polygon = testPolygon.features[0];
        const [w, s, e, n] = Utils.originRadiusToBbox(origin, radius);
        const nw = [w, n], se = [e, s];
        polygon.geometry.coordinates[0] = [
            nw, [se[0], nw[1]], se, [nw[0], se[1]], nw
        ]; // [w,n],[e,n],[e,s],[w,s],[w,n]
        return {
            feature: polygon,
            northWest: nw,
            southEast: se,
        };
    }
    // 创建监视器
    static _createWatcher(cbs, res) {
        // 判别是rgb请求还是vector请求，是否是pending状态
        let isVecPending = cbs.onVectorDem ? true : false;
        let isRgbPending = cbs.onRgbDem ? true : false;
        const ret = { vectorDem: [], rgbDem: [], debug: null };

        const isDone = () => !isVecPending && !isRgbPending;

        // 如果两种请求类型都不是，则报错，并修改promise状态，resolve数据结束
        if (isDone()) {
            console.log('no callbacks are set');
            res(ret);
            return null;
        }

        // 返回一个函数，用于接收payload参数，并进行处理
        return payload => {
            // 解构payload参数，获取what、data和debug
            const { what, data, debug } = payload;
            ret.debug = debug;

            if (what === 'dem-vec') {
                isVecPending = false;
                ret.vectorDem = data;
            }
            if (what === 'dem-rgb') {
                isRgbPending = false;
                ret.rgbDem = data;
            }
            if (isDone()) {
                console.log('all callbacks are complete');
                res(ret);
            }
        };
    }

    /**
     * 获取地形贴图
     * @param {*} origin 
     * @param {*} radius 
     * @param {*} zoom 
     * @param {*} cbs 
     * @returns 
     */
    getTerrain(origin, radius, zoom, cbs={}) {
        return new Promise((res, rej) => {
            try {
                const watcher = ThreeGeo._createWatcher(cbs, res);
                if (!watcher) return;

                // static parameters
                // _unitsSide 默认为1
                const _unitsSide = this.constUnitsSide;
                const unitsPerMeter = ThreeGeo._getUnitsPerMeter(_unitsSide, radius);
                const projectCoord = (coord, nw, se) =>
                        ThreeGeo._projectCoord(_unitsSide, coord, nw, se);
                const {isNode, isDebug, apiRgb} = this;

                // callbacks
                const { onRgbDem, onSatelliteMat, onVectorDem } = cbs;

                // ROI
                const bbox = ThreeGeo.getBbox(origin, radius);
                console.log('bbox:', bbox);
                // 该经纬度下的贴图位置
                const zpCovered = ThreeGeo.getZoomposCovered(bbox.feature, zoom);
                console.log('(satellite-level) zpCovered:', zpCovered);

                if (onRgbDem) {
                    (new RgbModel({
                        unitsPerMeter, projectCoord,
                        isNode, isDebug, apiRgb,
                        onRgbDem, onSatelliteMat, watcher,
                    })).fetch(zpCovered, bbox);
                }
            } catch (err) {
                console.error('err:', err);
                rej(err);
            }
        });
    }
    // 获取rgb地形
    async getTerrainRgb(origin, radius, zoom, _cb=undefined) {
        const { rgbDem: objs, debug } = await this.getTerrain(origin, radius, zoom, {
            // Set dummy callbacks to trigger rgb DEM fetching
            onRgbDem: () => {},
            onSatelliteMat: () => {},
        });
        return _cb ? _cb(objs) : ThreeGeo._createDemGroup('dem-rgb', objs, debug);
    }

    async getTerrainVector(origin, radius, zoom, _cb=undefined) {
        const { vectorDem: objs, debug } = await this.getTerrain(origin, radius, zoom, {
            // Set dummy callbacks to trigger vector DEM fetching
            onVectorDem: () => {},
        });
        return _cb ? _cb(objs) : ThreeGeo._createDemGroup('dem-vec', objs, debug);
    }

    static _createDemGroup(name, objs, debug) {
        const group = new THREE.Group();
        group.name = name;
        group.userData['debug'] = () => {
            if (!debug) console.warn('Use the `isDebug` option to enable `.userData.debug()`.');

            return debug;
        };
        for (let obj of objs) { group.add(obj); }

        return group;
    }

    setApiVector(api) { this.apiVector = api; }
    setApiRgb(api) { this.apiRgb = api; }
    setApiSatellite(api) { this.apiSatellite = api; }
}

ThreeGeo.Utils = Utils;
ThreeGeo.Laser = Laser;

export default ThreeGeo;