const computeSeamRows = (shift,totalCount,rowCount) => {
    // let totalCount = 49152; // 128 * 128 * 3
    // let rowCount = 384; // 128 * 3
    let rows = [[],[],[],[]];
    for (let c = 0; c < rowCount; c += 3) {
        // 0, 1, 2, 3; north, west, south, east; +y, -x, -y, +x
        rows[0].push(c+1+shift);
        rows[1].push(c/3*(rowCount)+1+shift);
        rows[2].push(c+1+totalCount-rowCount+shift);
        rows[3].push((c/3+1)*(rowCount)-2+shift);
    }
    return rows;
};
const constSeamRows = computeSeamRows(1, 256*256*3, 256*3);
const constVertices = 256;
// 处理相邻瓦片之间，高程缝隙问题。
// 处理时不仅要处理2,3位置，也要反过来求0,1,4位置
// todo 如果将高程和临接数据放在线下计算，则不需要再需要实时计算。
// 考虑到浏览器的性能，建议在线下将临接数据进行拼接好。则该类不需要再进行计算临接，同时不需要每次更改mesh的geography。
class neighbor{
    stitchWithNei2(array, arrayNei) {
        // add a new south row
        // 在最下面的数据增加一行 128*3
        for (let i = 0; i < constVertices; i++) {
            let indexZ = constSeamRows[2][i] + constVertices*3; // new south row
            let indexZNei = constSeamRows[0][i];                // north row to copy
            array[indexZ-2] = arrayNei[indexZNei-2];            // a new x
            array[indexZ-1] = arrayNei[indexZNei-1];            // a new y
            array[indexZ] = arrayNei[indexZNei];                // a new z
        }
    }

    stitchWithNei3(array, arrayNei) {
        // add a new east col
        for (let i = 0; i < constVertices; i++) {
            let indexZ = constSeamRows[3][i] + (1+i)*3;         // new east col
            let indexZNei = constSeamRows[1][i];                // west col to copy
            array.splice(indexZ-2, 0, arrayNei[indexZNei-2]);
            array.splice(indexZ-1, 0, arrayNei[indexZNei-1]);
            array.splice(indexZ, 0, arrayNei[indexZNei]);
        }
    }
    stitchWithNei6(array, arrayNei6){
        if (arrayNei6) {
            array.push(arrayNei6[0], arrayNei6[1], arrayNei6[2]);
        } else {
            // filling with a degenerated triangle
            let len = array.length;
            array.push(array[len-3], array[len-2], array[len-1]);
        }
    }
    // 获取了八个邻居的坐标,返回为[[x,y],[x,y]]
    getNeighbors8(id) {
        // 8-neighbors:
        // 4 0 7
        // 1 + 3
        // 5 2 6

        // 0, 1, 2, 3: north, west, south, east; +y, -x, -y, +x
        // 4, 5, 6, 7: diagonal neighbors
        const zoomposNeighborsDiff = [
            [0, -1], [ -1, 0], [0, 1], [1, 0],
            [-1, -1], [-1, 1], [1, 1], [1, -1],
        ];
        const neighbors = [];
        zoomposNeighborsDiff.forEach(zoomposDiff => {
            const zoomposNei = zoomposDiff.map((coord) => coord + id);
            // console.log('8-neighbor candidate:', zoomposNei);
            neighbors.push(zoomposNei);
        });
        return neighbors;
    }
    // 实际只获取了三个邻居的数据
    // [3049,1490] [3050,1490]
    // [3050,1491] [30949,1491]
    // elevations为所有的高程数据map，id为position数据为[x,y]
    static getNeighborsInfo(elevations, id) {
        const infoNei = {};
        this.getNeighbors8(id).forEach((zoomposNei, idxNei) => {
            const id = zoomposNei.join('/');
            if (id in dataEleIds) {
                const arrayNei = dataEle[dataEleIds[id]][1];
                // console.log('real neighbor yes:', zoomposNei, idxNei, arrayNei);
                infoNei[idxNei] = arrayNei;
            }
        });
        return infoNei;
    }
    // 处理当前临接点的高程数据。elevations为所有高程数据，id为当前高程数据id
    async resolveSeams(elevations, id) {
        let cSegments = [constVertices-1, constVertices-1];
        const current = elevations[id];
        if (current.state !== 4) {
            if (current.state === 0) {
                // 为0时三个位置均未处理过，全部进行临接处理
                const south = elevations[id+[1,0]];
                if (south) {
                    stitchWithNei2(current.data, south.data);
                    current.state = 1;
                    current.height = 256;
                }
                const east = elevations[id+[0,1]]
                if (east) {
                    stitchWithNei3(current.data, east.data);
                    current.state = current.state + 2;
                    current.width = 256;
                }
                if (current.state == 3 && elevations[id + [1, 1]]){
                    const southEast = elevations[id + [1, 1]];
                    stitchWithNei6(current.data, southEast.data);
                    current.state = 4;
                } else {
                    stitchWithNei6(current.data, null);
                }
            }
            if (current.state === 1) {
                // 为1时，只有右边和右下角要进行处理
                const east = elevations[id+[0,1]]
                if (east) {
                    stitchWithNei3(current.data, east.data);
                    current.state = current.state + 2;
                    current.width = 256;
                }
                if (current.state == 3 && elevations[id + [1, 1]]){
                    const southEast = elevations[id + [1, 1]];
                    stitchWithNei6(current.data, southEast.data);
                    current.state = 4;
                } else {
                    stitchWithNei6(current.data, null);
                }
            }
            if (current.state === 2) {
                const south = elevations[id+[1,0]];
                if (south) {
                    stitchWithNei2(current.data, south.data);
                    current.state = 1;
                    current.height = 256;
                }
                if (current.state == 3 && elevations[id + [1, 1]]){
                    const southEast = elevations[id + [1, 1]];
                    stitchWithNei6(current.data, southEast.data);
                    current.state = 4;
                } else {
                    stitchWithNei6(current.data, null);
                }
            }
            if (current.state === 3) {
                if (current.state == 3 && elevations[id + [1, 1]]){
                    // 原来不存在右下角临接时用的是自身的像素填充，当检测到存在时使用右下角元素进行填充。
                    const southEast = elevations[id + [1, 1]];
                    current.data.pop();
                    current.data.pop();
                    current.data.pop();
                    current.data.push(southEast.data[0], southEast.data[1], southEast.data[2]);
                    current.state = 4;
                } else {
                    stitchWithNei6(current.data, null);
                }
            }
            
        }
        // 递归一下
        // 0, 1, 2, 3: north, west, south, east; +y, -x, -y, +x
        // 4, 5, 6, 7: diagonal neighbors
        const neighborsDiff = [
            [0, -1], [ -1, 0], [0, 1],[1, 0],
            [-1, -1], [-1, 1], [1, -1],[1, 1]
        ];
        const neighbors = [];
        neighborsDiff.forEach(zoomposDiff => {
            const neighbor = zoomposDiff.map((coord) => coord + id);
            // console.log('8-neighbor candidate:', zoomposNei);
            neighbors.push(neighbor);
        });
        neighbors.forEach(neighbor => {
            resolveSeams(elevations,neighbor);
        });
    }
    // 当删除数据时对擦除的数据进行维护
    // 主要处理在删除数据以后处在边缘的那些数据，非边缘数据不用处理
    deleteSeams(elevations, id) {
        // todo 待定   
    }
    
}