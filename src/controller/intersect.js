import * as THREE from 'three';
class Intersect{
    constructor(){
        this._raycaster = new THREE.Raycaster();
    }
    /**
     * 求鼠标点击的点的物体经纬度和xyz坐标。
     * 先调用setData方法，在调用该方法。
     * @param {*} mx 界面x坐标
     * @param {*} my 界面y坐标
     * @param {*} meshes mesh
     * @param {*} width 宽度
     * @param {*} height 高度
     * @param {*} camera 摄像头
     * 拿到mesh，通过mesh的name可拿到 name = `dem-rgb-zoom/x/y`;
     * insect : {
     *  distance: 0.12887970453917627,
     *  face:{},
     *  object:{} // 这里为mesh对象
     *  point：{} // 交点坐标
     *  UV：{x,y} // 未关注，不知作用。
     * }
     */
    raycastInteractives(mx, my,width,height, meshes,camera) {
        this.setData(meshes,width,height,camera);
        const insect = this._interact(mx, my, this.meshs);
        return insect;
    }
    /**
     * 
     * @param {*} mx 界面坐标x 
     * @param {*} my 界面坐标y
     * @param {*} meshes mesh集合
     * @returns 交点mesh
     */
    _interact(mx, my, meshes) {
        const visibilities = {};

        meshes.forEach(mesh => {
            visibilities[mesh.uuid] = mesh.visible; // save
            mesh.visible = true;                    // force visible for raycast
        });

        const output = raycastFromMouse(mx, my, meshes);                  // apply

        meshes.forEach(mesh => {
            mesh.visible = visibilities[mesh.uuid]; // restore
        });

        return output;
    }
    /**
     * 通过屏幕x,y获取经纬度信息
     * @param {*} mx 
     * @param {*} my 
     * @returns 
     */
    getLatLngByXY(mx, my){
        const isect = this.raycastInteractives(mx, my);
        const pt = isect.point;
        const coord = this._reverseCoord(1.0, [pt.x, pt.y], [bbox[0], bbox[3]], [bbox[2], bbox[1]]);
        console.log('corrd:', corrd);
        console.log('coord:', coord);
        return llTarget;
    }
    // 获取视界内的tile id
    getBoxByXY(mx, my){
        
    }
    /**
     * 不建议直接调用。
     * @param {*} mx 
     * @param {*} my 
     * @param {*} meshes 
     * @param {*} recursive 
     * @returns 
     */
    raycastFromMouse(mx, my, meshes, recursive=false) {
        //---- NG: 2x when starting with Chrome's inspector mobile
        // const {width, height} = this.renderer.domElement;
        // const {width, height} = this.canvas;
        //---- OK
        const {width, height} = this;

        return this._raycastFromMouse(
            mx, my, width, height, this.camera,
            meshes, recursive);
    }
    _raycastFromMouse(mx, my, width, height, cam, meshes, recursive=false) {
        const mouse = new THREE.Vector2( // normalized (-1 to +1)
            (mx / width) * 2 - 1,
            - (my / height) * 2 + 1);
        // https://threejs.org/docs/#api/core/Raycaster
        // update the picking ray with the camera and mouse position
        this._raycaster.setFromCamera(mouse, cam);
        return this._raycast(meshes, recursive, null);
    }
    _raycast(meshes, recursive, faceExclude) {
        const isects = this._raycaster.intersectObjects(meshes, recursive);
        if (faceExclude) {
            for (let i = 0; i < isects.length; i++) {
                if (isects[i].face !== faceExclude) {
                    return isects[i];
                }
            }
            return null;
        }
        return isects.length > 0 ? isects[0] : null;
    }
    
    setMeshs(meshs){
        this.meshs = meshs;
    }
    clearMeshs(){
        this.meshs = null;
    }
    setWidthHeight(width, height){
        this.width = width;
        this.height = height;
    }
    setCamera(camera){
        this.camera = camera;
    }
    setData(meshs, width, height, camera){
        this.setMeshs(meshs);
        this.setWidthHeight(width, height);
        this.setCamera(camera);
    }

}