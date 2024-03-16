import Fetch from './fetch.js';
import SphericalMercator from '@mapbox/sphericalmercator';
import * as THREE from 'three';
const constVertices = 256;
// const constTilePixels = new SphericalMercator({size: 128});
const constTilePixels = new SphericalMercator();
// use shift = 0 when array's format is [x0, z0, y0, x1, z1, y1, ... x127, z127, y127]
// 0: Array(128) [1, 4, 7, 10, 13, 16, 19, 22, ... 379, 382]
// 1: Array(128) [1, 385, 769, 1153, 1537, 1921, 2305, 2689, ... 48385, 48769]
// 2: Array(128) [48769, 48772, 48775, 48778, 48781, 48784, 48787, 48790, ... 49147, 49150]
// 3: Array(128) [382, 766, 1150, 1534, 1918, 2302, 2686, 3070, ... 48766, 49150]
// use shift = 1 when array's format is [x0, y0, z0, x1, y1, z1, ... x127, y127, z127]
// 0: Array(128) [2, 5, 8, 11, ... 380, 383]
// 1: Array(128) [2, 386, 770, 1154, ... 48386, 48770]
// 2: Array(128) [48770, 48773, 48776, 48779, ... 49148, 49151]
// 3: Array(128) [383, 767, 1151, 1535, ... 48767, 49151]
class Loader{
    // 模型加载器
    constructor(upperLeft, lowerRight, constUnitsSide=1.0){
        this.nw = upperLeft;
        this.se = lowerRight;
        this.constUnitsSide = constUnitsSide;
    }
    
    
    async fetch(zoomId){
        const tile = await Fetch.fetchTile(zoomId, isNode);
        if (tile !== null) {
            const plane = this.addTile256(tile, zoomId, bbox);
            return plane;
        }
    }
    addTile256(pixels, zoompos){
        const unitsPerMeter = this.getUnitsPermeter();
        // 需要进行nw，se进行加载。
        let elevations = [];
        if (pixels) {
            let R, G, B;
            for (let e = 0; e < pixels.data.length; e += 4) {
                R = pixels.data[e];
                G = pixels.data[e+1];
                B = pixels.data[e+2];
                // 将rgb值转化为高度值
                elevations.push(-10000 + ((R * 256 * 256 + G * 256 + B) * 0.1));
            }
        } else {
            elevations = new Array(262144).fill(0); // 512 * 512 (=1/4 MB)
        }
        let array = [];
        let dataIndex = 0;
        for (let row = 0; row < constVertices; row++) {
            for (let col = 0; col < constVertices; col++) {
                let lonlatPixel = constTilePixels.ll([
                    zoompos[1] * constVertices + col,
                    zoompos[2] * constVertices + row
                ], zoompos[0]);
                // console.log('lonlatPixel:', lonlatPixel);
                // NOTE: do use shift = 1 for computeSeamRows()
                array.push(
                    ...this.projectCoord(lonlatPixel, this.nw, this.se),
                    elevations[dataIndex] * unitsPerMeter);
                dataIndex++;
            }
        }
        let geom = new THREE.PlaneBufferGeometry(
            1, 1, cSegments[0], cSegments[1]);
        geom.attributes.position.array = new Float32Array(arr);
        let plane = new THREE.Mesh(geom,
            // new THREE.MeshBasicMaterial({   //修改材质，使用可接受光的材质
            new THREE.MeshLambertMaterial({
                wireframe: true,
                color: 0xcccccc,
            }));
        plane.name = `dem-rgb-${zoompos.join('/')}`;
        plane.userData.threeGeo = {
            tile: _toTile(zoompos),
            srcDem: {
                tile: zoompos,
                uri: Fetch.getUri(zoompos),
            },
        };
        plane.receiveShadow = true;
        this.resolveTex(zoompos, isNode, tex => {
            //console.log(`resolve tex done for ${zoompos}`);
            if (tex) {
                // plane.material = new THREE.MeshBasicMaterial({
                plane.material = new THREE.MeshLambertMaterial({
                    side: THREE.FrontSide,
                    // side: THREE.DoubleSide,
                    map: tex,
                });
                plane.receiveShadow = true;
            }
        });
        return plane;

    }
    async resolveTex(zoompos, isNode, onTex) {
        const pixels = await Fetch.fetchTile(zoompos, isNode);

        let tex = null;
        if (pixels !== null) {
            tex = new THREE.DataTexture(this.createDataFlipY(pixels.data, pixels.shape),
                pixels.shape[0], pixels.shape[1], THREE.RGBAFormat);

            tex.needsUpdate = true;
        } else {
            console.log(`fetchTile() failed for tex of zp: ${zoompos}`);
        }

        if (onTex) {
            onTex(tex);
        }
    }
    /**
     * 
     * @param {*} coord 坐标点，经纬度值lat,lon。
     * @param {*} nw 左上角坐标。nw和se坐标是在剪切正射坐标时即可缺点的。
     * @param {*} se 右下角坐标
     * @returns 该经纬度坐标在xyz坐标系的点
     */
    projectCoord(coord, nw=[], se=[]) {
        return this._projectCoord(this.constUnitsSide, coord, nw, se);
    }
    // 计算项目坐标, coord为具体的位置上大小，从全世界地图的整体上第多少个像素
    // 修改方案1：在图像分割时确定这两个坐标，并作为参数值进行打包。
    // 修改方案2：取世界两级坐标[-180,90] [180, -90].
    // 修改方案3：若是只在疆内使用则取疆内的bbox坐标。
    // 个人倾向于方案1.
    /**
     * coord->xy
     * @param {*} unitsSide 每米单位数
     * @param {*} coord 经纬度坐标
     * @param {*} nw bbox的north和west值
     * @param {*} se 同上
     * @returns xy，threejs三维坐标的xy坐标
     * 例如：[-43.726036560354004,87.1197645174575]-> [0.042833014271223324,-0.05511088341042264]
     */
    _projectCoord(unitsSide, coord, nw, se) {
        return [ // lng, lat -> px, py
            unitsSide * (-0.5 + (coord[0]-nw[0]) / (se[0]-nw[0])),
            unitsSide * (-0.5 - (coord[1]-se[1]) / (se[1]-nw[1]))
        ];
    }
    /**
     * _projectCoord方法的反向计算，xy->coord
     * @param {*} unitsSide 每米单位数
     * @param {*} xy xy坐标
     * @param {*} nw bbox的 north和west坐标值
     * @param {*} se 与nw参数同理。
     * @returns coord 经纬度坐标值
     * 例如： [0.042833014271223324,-0.05511088341042264]-> [-43.726036560354004,87.1197645174575]
     * 说明：由于float数值的精度损失，小数点前五位均一致，之后的数字已不精确。
     */
    _reverseCoord(unitsSide,xy, nw,se){
        return [ 
            // 
            (xy[1]/unitsSide+0.5)*(nw[1]-se[1])+se[1],
            (xy[0]/unitsSide+0.5)*(se[0]-nw[0])+nw[0]
        ]
    }
    // TODO 先以1公里为基础进行计算。如果出问题则对切图的大小进行实际计算公里数。
    getUnitsPermeter(){
        return this._getUnitsPerMeter(this.constUnitsSide, 1);
    }
    // 计算每米的单位数 unitsSide=1.0 radius为5时的 0.00014142135623730948
    _getUnitsPerMeter(unitsSide, radius) {
        return unitsSide / (radius * Math.pow(2, 0.5) * 1000);
    }
}
export default Loader;