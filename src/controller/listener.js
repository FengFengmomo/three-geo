class Listeners{
    constructor(){
        
    }
    
    onZoom(preZoom, currentZoom){
        // todo calculate 视图范围
        // 计算下个层级的tile id
        // 屏蔽当前层或者上级的tile
    }
    onMove(){

    }
    onClick(){

    }
    mouseMove(event){
        console.log(event);
    }
    // 选定点并绘制射线
    pick(mx, my) {
        this.currentX = mx;
        this.currentY = my;
        this.position.copy(this.camera.position);
        return;
    }

    wheel(event, position){
        // this.controls.enableZoom = false;
        // console.log(event.deltaY);
        console.log(event, position);
        return;
        this._delta += event.deltaY;
        setTimeout(() => {
            this._delta = 0;
        }, 1000);
        console.log(this._delta);
        if(Math.abs(this._delta) < 600){
            return;
        }
        this.zoom += this._delta>0?-1:1;
        // this._delta = 0;
        const target = this.getLatLngByXY(this.currentX, this.currentY); // 获取当前经纬度
        this.camera.position.set(this.position.x, this.position.y, 0.8);
        this.camera.lookAt(0,0,0);
        this.reloadPageWithLocation(target,"unkown");
    }
    mouseUp(mx,my){
        if(this.rightClick === false){
            return;
        }
        this.rightClick = false;
        this.distanceX = this.distanceX + mx - this.fromX;
        this.distanceY = this.distanceY + my - this.fromY;
        
        if(Math.abs(this.distanceX) < this.distanceThreshold && Math.abs(this.distanceY) < this.distanceThreshold){
            return;
        }
        this.distanceX = 0;
        this.distanceY = 0;
        const target = this.getLatLngByXY(this.currentX, this.currentY); // 获取当前经纬度
        this.reloadPageWithLocation(target,"unkown");
        this.camera.position.set(0, 0, 0.8);
        
        console.log("up");
        console.log(mx,my);
    }
    mouseDownRight(event){
        let mx = event.currentX;
        let my = event.currentY;
        // 为了实现pane功能，取消场景的左右旋转（因为会有冲突，导致镜头的bug，镜头四处晃）
        // 初步判定为 maphelper里面，判定摄像机位置和绘图位置出现镜头方向的冲突，镜头方向的更新
        // 目前情况先禁用旋转以实现拖动的功能。
        this.fromX = mx;
        this.fromY = my;
        this.rightClick = true;
        console.log("down");
        console.log(mx,my);
        
    }
}

export default Listeners;