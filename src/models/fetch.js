import xhr from 'xhr';
import Pbf from 'pbf';
import getPixelsDom from 'get-pixels'; // 'get-pixels/dom-pixels'
import Meta from 'es-pack-js/src/meta';

class Fetch {
    // 获取mapbox的uri链接
    static getUri(zoompos) {
        let prefix, res = '', middle;
        switch (api) {
            case 'mapbox-terrain-rgb':
                prefix = '../map_data/terrain';
                middle = 'terrain_rgb_';
                res = '.png';
                break;
            case 'mapbox-satellite':
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

    // 发送具体的请求
    static async getRgbTile(uri, isNode, res) {
        const gp = isNode ?
            await Meta.nodeRequire(global, 'get-pixels/node-pixels') : getPixelsDom;
        gp(uri, (error, pixels) => res(error ? null : pixels));
    }

    static isAjaxSuccessful(stat) {
        console.log('stat:', stat);
        // https://stackoverflow.com/questions/21756910/how-to-use-status-codes-200-404-300-how-jquery-done-and-fail-work-internally
        return stat >= 200 && stat < 300 || stat === 304;
    }

    // 构造请求并发送
    static fetchTile(zoompos, isNode) {
        const tag = 'fetchTile()';
        const uri = this.getUri(zoompos);
            
        console.log(`${tag}: uri: ${uri}`);

        const future = res => {
            let ret = null;
            
            ret = this.getRgbTile(uri, isNode, res);  // 返回请求的promise              
            
            return ret;
        };

        return new Promise(async (res, _rej) => {
            try {
                const ft = future(res);
                if (ft !== null) {
                    await ft;
                } else {
                    throw new Error(`${tag}: unsupported api: ${uri}`);
                }
            } catch (err) {
                console.warn(`${tag}: err: ${err}`);
                res(null);
            }
        });
    }
}

export default Fetch;