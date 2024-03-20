// 每个层级mesh的管理
class Meshs{
    constructor(startx, starty, endx, endy, zoom){
        this.startx = startx;
        this.starty = starty;
        this.endx = endx;
        this.endy = endy;
        this.zoom = zoom;
        // 
        this.mesh = new Array(endy-starty+1);
        for (let i = 0; i < this.endy-this.starty+1; i++) {
            this.mesh[i] = new Array(endx - startx+1);
        }

    }

    addMeshToScene(scene){
        for (let i = 0; i < this.endy-this.starty; i++) {
            for (let j = 0; j < this.endx - this.startx; j++) {
                if (this.mesh[i][j]) {
                    scene.add(this.mesh[i][j]);
                }
            }
        }
    }
    // 设置单一的mesh对象
    // x,y 为tileid
    setMesh(x, y, mesh){
        [x, y] = this.tileIdToArrayId([x, y]);
        this.mesh[y][x] = mesh;
    }
    clearAllMesh(){
        for (let i = 0; i < this.endy-this.starty; i++) {
            for (let j = 0; j < this.endx - this.startx; j++) {
                disposeObject(this.mesh[i][j]);
            }
        }
    }
    // 清除指定区域内的网格
    // fromX,fromY,toX,toY 为实际tile id
    clearMesh(fromX,fromY, toX,toY){
        [fromX, fromY] = this.tileIdToArrayId([fromX, fromY]);
        [toX, toY] = this.tileIdToArrayId([toX, toY]);
        for (let i = 0; i < this.endy-this.starty; i++) {
            for (let j = 0; j < this.endx - this.startx; j++) {
                if(i>=fromY && i<=toY && j>=fromX && j<=toX){
                    disposeObject(this.mesh[i][j]);
                }
            }
        }
    }
    // 在指定的区域范围内清除部分网格
    // 这里的X,Y均指gis的坐标上的x,y  当变成二维数组表示时则y为二维数组的行数，x为二维数组的列数
    // 前后几个方法均相同
    clearMeshRange(arrFromX,arrFromY,arrToX,arrToY, fromX, fromY, toX, toY){
        [arrFromX, arrFromY] = this.tileIdToArrayId([arrFromX, arrFromY]);
        [arrToX, arrToY] = this.tileIdToArrayId([arrToX, arrToY]);
        [fromX, fromY] = this.tileIdToArrayId([fromX, fromY]);
        [toX, toY] = this.tileIdToArrayId([toX, toY]);
        for (let i= arrFromY; i<=arrToY; i++){
            for (let j= arrFromX; j<=arrToX; j++){
                if(i>=fromY && i<=toY && j>=fromX && j<=toX){
                    disposeObject(this.mesh[i][j]);
                }
            }
        }
    }
    // 在指定区域内保留指定的网格
    keepMeshRange(arrFromX,arrFromY,arrToX,arrToY, fromX, fromY, toX, toY){
        [arrFromX, arrFromY] = this.tileIdToArrayId([arrFromX, arrFromY]);
        [arrToX, arrToY] = this.tileIdToArrayId([arrToX, arrToY]);
        [fromX, fromY] = this.tileIdToArrayId([fromX, fromY]);
        [toX, toY] = this.tileIdToArrayId([toX, toY]);
        for (let i= arrFromY; i<=arrToY; i++){
            for (let j= arrFromX; j<=arrToX; j++){
                if(i>=fromY && i<=toY && j>=fromX && j<=toX){
                    continue;
                } else{
                    disposeObject(this.mesh[i][j]);
                }
            }
        }
    }
    // 保留指定区域内的网格
    keepMesh(fromX,fromY, toX,toY){
        [fromX, fromY] = this.tileIdToArrayId([fromX, fromY]);
        [toX, toY] = this.tileIdToArrayId([toX, toY]);
        for (let i = 0; i < this.endy-this.starty; i++) {
            for (let j = 0; j < this.endx - this.startx; j++) {
                if(i>=fromY && i<=toY && j>=fromX && j<=toX){
                    continue;
                } else {
                    disposeObject(this.mesh[i][j]);
                }
            }
        }
    }
    // tile id 到数组id的转换 [tileX,tileY] 到[x,y]
    tileIdToArrayId(tileId){
        return [tileId[0]-this.startx,tileId[1]-this.starty];
    }
    // 数组id到tile id的转换[x,y]到 [tileX,tileY]
    arrayIdToTileId(arrayId){
        return [arrayId[0]+this.startx,arrayId[1]+this.starty];
    }

    static disposeMaterial(material) {
        if (material.map) material.map.dispose();
        material.dispose();
    }

    static disposeObject(obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) this.disposeMaterial(obj.material);
        if (obj.texture) obj.texture.dispose();
        obj = null;
    }
}

export default Meshs;