import xhr from 'xhr';
import Pbf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';
import getPixelsDom from 'get-pixels'; // 'get-pixels/dom-pixels'
import Utils from '../utils.js';

class Fetch {
    // 获取自定义的uri链接
    static getUriCustom(api, zoompos) {
        // Resolve the api type: e.g. `../data/${name}/custom-terrain-rgb` -> `custom-terrain-rgb`
        let _api = api.split('/');
        _api = _api.length ? _api[_api.length - 1] : 'Oops';

        let extension;
        switch (_api) {
            case 'custom-terrain-vector':
                extension = 'pbf';
                break;
            case 'custom-terrain-rgb':
                extension = 'png';
                break;
            case 'custom-satellite':
                extension = 'jpg';
                break;
            default:
                console.log('getUriCustom(): unsupported api:', api);
                return '';
        }
        return `${api}-${zoompos.join('-')}.${extension}`;
    }

    // 获取mapbox的uri链接
    static getUriMapbox(token, api, zoompos) {
        let prefix, res = '', middle;
        switch (api) {
            case 'mapbox-terrain-vector':
                // https://docs.mapbox.com/help/troubleshooting/access-elevation-data/#mapbox-terrain-vector-tileset
                // https://docs.mapbox.com/api/maps/#vector-tiles
                prefix = 'https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2';
                res = '.vector.pbf';
                break;
            case 'mapbox-terrain-rgb':
                // https://docs.mapbox.com/help/troubleshooting/access-elevation-data/#mapbox-terrain-rgb
                prefix = 'http://1.14.101.52/map_data/tile';
                prefix = '../map_data/terrain';
                middle = 'terrain_rgb_';
                res = '.png';
                break;
                
            case 'mapbox-satellite':
                // https://docs.mapbox.com/help/troubleshooting/migrate-legacy-static-images-api/
                // https://docs.mapbox.com/api/maps/#static-tiles
                prefix = '../map_data/tile';
                middle = 'tile_';
                res = '.png';
                // zoompos[0] -=2;
                break;
            default:
                console.log('getUriMapbox(): unsupported api:', api);
                return '';
        }
        // return `${prefix}/${zoompos.join('/')}${res}?access_token=${token}`;
        // return `${prefix}/${zoompos[0]}/${middle}${zoompos.join('_')}${res}`;
        return `${prefix}/${zoompos[0]}/${zoompos[1]}/${zoompos[2]}${res}`;
    }

    static dumpBufferAsBlob(buffer, name) {
        // https://discourse.threejs.org/t/how-to-create-a-new-file-and-save-it-with-arraybuffer-content/628/2
        // 将octet-stream数据转为Blob对象数组数据，
        //Blob 对象表示一个不可变、原始数据的类文件对象。它的数据可以按文本或二进制的格式进行读取，也可以转换成 ReadableStream 来用于数据操作。
        const file = new Blob([buffer], {type: 'application/octet-stream'});
        const anc = document.createElement('a');
        anc.href = URL.createObjectURL(file);
        anc.download = name;
        document.body.appendChild(anc);
        anc.click();
    }

    static async dumpBlob(uri, isNode, api, zoompos) {
        try {
            const ab = await this.req(uri, isNode);
            this.dumpBufferAsBlob(ab, `${api}-${zoompos.join('-')}.blob`);
        } catch (err) {
            console.error('dumpBlob(): err', err);
        }
    }
    // 发送具体的请求
    static async getRgbTile(uri, isNode, res) {
        const gp = isNode ?
            await Utils.Meta.nodeRequire(global, 'get-pixels/node-pixels') : getPixelsDom;
        gp(uri, (error, pixels) => res(error ? null : pixels));
    }

    static async getVectorTile(uri, isNode, res) {
        if (isNode && !uri.startsWith('http://') && !uri.startsWith('https://')) {
            const fs = await Utils.Meta.nodeRequire(global, 'fs');
            fs.readFile(uri, (error, data) =>
                res(error ? null : new VectorTile(new Pbf(data.buffer))));
        } else {
            res(new VectorTile(new Pbf(await this.req(uri, isNode))));
        }
    }

    static async req(uri, isNode) {
        // "API is a subset of request" - https://github.com/naugtur/xhr
        const _req = isNode ? await Utils.Meta.nodeRequire(global, 'request') : xhr;

        return new Promise((res, rej) => {
            _req({ uri, responseType: 'arraybuffer' }, (error, response, ab) => {
                const err = error || !this.isAjaxSuccessful(response.statusCode);
                err ? rej(err) : res(ab);
            });
        });
    }

    static isAjaxSuccessful(stat) {
        console.log('stat:', stat);
        // https://stackoverflow.com/questions/21756910/how-to-use-status-codes-200-404-300-how-jquery-done-and-fail-work-internally
        return stat >= 200 && stat < 300 || stat === 304;
    }

    // compute elevation tiles belonging to the gradparent zoom level
    // 计算相应缩放级别的高程贴图
    static getZoomposEle(zpArray) {
        const elevations = {};
        zpArray.forEach(zoompos => {
            let grandparent = [
                zoompos[0]-2,
                Math.floor(zoompos[1]/4), // Math.floor 向下求整
                Math.floor(zoompos[2]/4)];
            if (elevations[grandparent]) {
                elevations[grandparent].push(zoompos);
            } else {
                elevations[grandparent] = [zoompos];
            }
        });
        // console.log('elevations:', elevations);

        return Object.keys(elevations)
            .map(triplet => triplet.split(',').map(num => parseFloat(num)));
    }

    // 构造请求并发送
    static fetchTile(zoompos, api, token, isNode) {
        const tag = 'fetchTile()';
        const isMapbox = api.startsWith('mapbox-');
        const uri = isMapbox ?
            this.getUriMapbox(token, api, zoompos) :
            this.getUriCustom(api, zoompos);
        console.log(`${tag}: uri: ${uri}`);

        const future = res => {
            let ret = null;
            if (api.includes('mapbox-terrain-vector') ||
                api.includes('custom-terrain-vector')) {
                ret = this.getVectorTile(uri, isNode, res);
            } else if (api.includes('mapbox-terrain-rgb') ||
                api.includes('mapbox-satellite') ||
                api.includes('custom-terrain-rgb') ||
                api.includes('custom-satellite')) {
                ret = this.getRgbTile(uri, isNode, res);  // 返回请求的promise              
            }
            return ret;
        };

        return new Promise(async (res, _rej) => {
            try {
                const ft = future(res);
                if (ft !== null) {
                    await ft;
                } else {
                    throw new Error(`${tag}: unsupported api: ${api}`);
                }
            } catch (err) {
                console.warn(`${tag}: err: ${err}`);
                res(null);
            }
        });
    }
}

export default Fetch;