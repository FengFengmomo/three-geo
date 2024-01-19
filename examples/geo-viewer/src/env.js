export default {
    zoom: 16, // satellite zoom resolution -- min: 11, defaut: 13, max: 17
    enableTilesLeaflet: true,
    isGuiClosed: false,
    tokenMapbox: 'pk.eyJ1IjoicGVuZ2RhZGEiLCJhIjoiY2xteDcwa2ZxMHg0ejJsbGJ0d2JobjNoZyJ9.ANeQNGpTHlxghsCRYdEFaA', // <---- set your Mapbox API token here
    zooms:{
        12: [20,30],
        13: [10,14.6],
        14: [4.9, 7.3],
        15: [2.4, 3.6],
        16: [1.2, 1.8],
        17: [0.61, 0.917],
        18: [0.3, 0.458],
        19: [0.152, 0.229],
        20: [0.076, 0.114],
        21: [0.038, 0.057],
        22: [0.019, 0.028],
        23: [0.009, 0.013]
    }
};
