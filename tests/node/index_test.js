global.require = require;
const path = require('path');
const srcDir = path.join(__dirname, '../../src');
const modelDir = path.join(__dirname, '../../src/models');

const __fetchPath = `${modelDir}/fetch.js`;
const __rgbPath = `${modelDir}/rgb.js`;
const __vectorPath = `${modelDir}/vector.js`;
// const Fetch = require( './fetch.js');
const Fetch = require(__fetchPath);
const RgbModel = require(__rgbPath);
const VectorModel = require(__vectorPath);

// const controller = new AbortController();
// controller.signal;
// Promise.race

test('getZoomposEle', () => {
    Fetch.getZoomposEle(
        {
            "zoompos":{
                "zoompos":1,
                "zoompos_x":1,
                "zoompos_y":1
            }
        },
        function(data){
            console.log(data);
        }
    );
});