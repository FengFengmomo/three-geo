import env from "./env.js"
import Lorder from "../models/loader.js"
import Meshs from "../models/meshs.js"

class TileController{
    constructor(scene, refresh){
        this.latlng = env.latlng;
        this.zoomStart = env.zoomStart;
        this.zoomPos = env.zoomPos;
        this.currentZoom = this.zoomStart;
        this.meshMap = new Map();
        env.zoomPos.forEach((value, key) => {
            let startx = value[0][0];
            let starty = value[0][1];
            let endx = value[1][0];
            let endy = value[1][1];
            this.meshMap.set(key, new Meshs(startx, starty, endx, endy, key));
        });
        this.lorder = new Lorder(env.latlng[0], env.latlng[1], refresh);
        this.scene = scene;
        this.refresh = refresh;
    }

    // 未给定数据情况下，默认加载的贴图范围，或者认为是系统第一次加载的数据。
    defaultTile(){
        let [upperLeft, downRight]  = this.zoomPos.get(this.zoomStart);
        let total = (upperLeft[0] - downRight[0]) * (upperLeft[1] - downRight[1])
        if (total < 16) {
            this.lorderTileRange([upperLeft, downRight]);
        }
    }

    calculateBox(tileId){

    }
    calculateBox(latlng,zoom){

    }
    // 加载给定范围的贴图
    // idRange: [[48626,41635], [48628,41637]]
    lorderTileRange(idRange){
        let [[fromX, fromY],[toX,toY]] = idRange
        for (let i = fromX; i <= toX; i++) {
            for (let j = fromY; j <= toY; j++) {
                this._lordAddMeshToScene([i, j])
            }
        }
    }
    /**
     * 异步加载mesh并添加到mesh里面
     * @param {*} position [x,y] 
     */
    async _lordAddMeshToScene(position){
        let meshs = this.meshMap.get(this.currentZoom);
        let mesh = await this.lorder.fetch([this.currentZoom, position[0], position[1]]);
        meshs.setMesh(position[0], position[1], mesh);
        // 测试阶段，先在此添加 mesh
        this.scene.add(mesh);
        this.refresh();
    }
    // 加载单一的贴图
    async lorderTile(position){
        let meshs = this.meshMap.get(this.currentZoom);
        let mesh = await this.lorder.fetch([this.currentZoom, position[0], position[1]]);
        meshs.setMesh(position[0], position[1], mesh);
    }
    // 根据指定的贴图id，加载当前zoom下的下一个zoom
    // 如14级id为100，100的贴图加载完毕以后，如果需要进行局部显示，则当15级的【201,201】【201,202】【202,201】，【202,202】
    lorderDetail(tileId){
        let [tileX, tileY] = tileId;
        tileX = tileX * 2;
        tileY = tileY * 2;
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                async () => {
                    let mesh = this.meshMap.get(this.currentZoom + 1).mesh;
                    let tile = await this.lorder.fetch([this.currentZoom + 1, tileX + i, tileY + j]);
                    mesh.setMesh(tileX + i, tileY + j, tile);
                }
            }
        }
    }
    // 清除贴图，清理对应层级的内存
    clearTile(zoom){
        let meshs = this.meshMap.get(zoom);
        meshs.disposeAllMesh();
    }

    disposeAllMesh(){
        for (let i = 0; i < this.meshMap.size; i++) {
            let meshs = this.meshMap.get(this.zoomStart + i)
            meshs.clearAllMesh();
            this.meshMap.delete(this.zoomStart + i);
        }
    }

    addMesh(){
        let meshs = this.meshMap.get(this.currentZoom);
        meshs.addMeshToScene(this.scene);

    }
}

export default TileController;