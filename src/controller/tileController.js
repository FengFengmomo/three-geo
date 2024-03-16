import env from "./env.js"
import Lorder from "../models/loader.js"
import Meshs from "../models/mesh.js"

class tileController{
    constructor(){
        this.latlng = env.latlng;
        this.zoomStart = env.zoomStart;
        this.zoomPos = env.zoomPos;
        this.currentZoom = this.zoomStart;
        this.meshMap = new Map();
        for (let i = 0; i < this.zoomPos.size; i++) {
            let startx = this.zoomPos.get(this.zoomStart)[0][0];
            let starty = this.zoomPos.get(this.zoomStart)[0][1];
            let endx = this.zoomPos.get(this.zoomStart)[1][0];
            let endy = this.zoomPos.get(this.zoomStart)[1][1];
            this.meshMap.set(this.zoomStart + i, new Meshs(startx, starty, endx, endy, this.zoomStart + i));
        }
        this.lorder = new Lorder(env.zoomPos[0], env.zoomPos[1]);
    }

    // 未给定数据情况下，默认加载的贴图范围，或者认为是系统第一次加载的数据。
    defaultTile(){
        [upperLeft, downRight]  = this.zoomPos[this.zoomStart]
        let total = (upperLeft[0] - downRight[0]) * (upperLeft[1] - downRight[1])
        if (total < 16) {
            this.lorderTile(this.zoomPos[this.zoomStart])
        }

    }

    calculateBox(tileId){

    }
    calculateBox(latlng,zoom){

    }
    // 加载给定范围的贴图
    // idRange: [[48626,41635], [48628,41637]]
    lorderTile(idRange){
        [[fromX, fromY],[toX,toY]] = idRange
        for (let i = fromX; i <= toX; i++) {
            for (let j = fromY; j <= toY; j++) {
                
            }
        }
    }
    // 加载单一的贴图
    lorderTile(id){

    }
    // 根据指定的贴图id，加载当前zoom下的下一个zoom
    // 如14级id为100，100的贴图加载完毕以后，如果需要进行局部显示，则当15级的【201,201】【201,202】【202,201】，【202,202】
    lorderDetail(){

    }
    // 清除贴图，清理内存
    clearTile(){
        
    }
    disposeAllMesh(){
        for (let i = 0; i < this.meshMap.size; i++) {
            let meshs = this.meshMap.get(this.zoomStart + i)
            meshs.clearAllMesh();
            this.meshMap.delete(this.zoomStart + i);
        }
    }
}