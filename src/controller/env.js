var zoomPos = new Map(); 
export {zoomPos};

export default {
    zoomStart: 16, // satellite zoom resolution -- min: 11, defaut: 13, max: 17
    latlng: [[43.7288086, 87.110804] , [43.720897, 87.124959]], //[维度，经度] 左上角和右下角的经纬度范围
    zoomPos: new Map([
        [16, [[48626,41635], [48628,41637]]],
        [17, [[97252,83270], [97257,83274]]],
        [18, [[194504,166541], [194514,166549]]],
        [19, [[389008,333082], [389028,333098]]],
        [20, [[778016,666165], [778057,666197]]],
        [21, [[1556033,1332331], [1556115,1332394]]],
        [22, [[3112066,2664662], [3112231,2664789]]],
        [23, [[6224132,5329324], [6224462,5329579]]]
    ]),
    enableTilesLeaflet: true,
    isGuiClosed: false,
};
