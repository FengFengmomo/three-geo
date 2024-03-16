import Env from './env.js';
//import Env from './envs-ignore/env-dev.js';
//import Env from './envs-ignore/env-io.js';

import MiniThreeLet from './miniThreeLet/MiniThreeLet.js';
// import Threelet from '../../deps/threelet/index.js';
import Light from './light.js';
import OrbitControls from '../../examples/deps/three/examples/js/controls/OrbitControls.js';

const { THREE  } = window;
const { OrbitControls } = THREE;

class App extends MiniThreeLet {
    constructor() {
        super({ canvas: document.getElementById('viewer') ,optAxes: false});
    }

    onCreate(_params) { // override
        this.env = Env;

        this.camera.position.set(0, 0, 0.8);
        this.camera.up.set(0, 0, 1); // 摄像头方向，沿着z轴正方向
        this.cameraZoom = this.camera.zoom;
        this.renderer.autoClear = false;
        this.currentX = null; // 放缩时 当前鼠标的坐标
        this.currentY = null; //
        this.fromX =null; // 拖动时 当前鼠标的坐标
        this.fromY =null;
        this.rightClick = false;
        this.distanceX = 0;
        this.distanceY = 0;
        this.distanceThreshold = 300;
        this._delta = 0;
        this.position = new THREE.Vector3();

        // 初始化控件
        this.initComponents();

        this.render = () => { // override
            this._render();
            this.monitor.updateStats();
            this.monitor.updateCam(this.camera, this.projection);
            // this.map.plotCam(this.camera);
        };
        this.setup('mod-controls', OrbitControls);
        this.render(); // first time

        // this.anim = new Anim(this.render, this.onAnimate.bind(this));

        this.monitor.updateTerrain(this.origin, this.zoom);
        // this.monitor.updateMap(this.map.getZoom());
        this.monitor.updateCam(this.camera, this.projection);
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI/3;
        this.controls.minAzimuthAngle = 0;  
        this.controls.maxAzimuthAngle = 0; 

        this.controls.addEventListener('mouse-move', (mx, my) => this.pick(mx, my));
        // this.on('pointer-click', (mx, my) => this.updateMeasure(mx, my));
        // this.on('pointer-click-right', (mx, my) => {
            // console.log("click complete");
            // this.updateOrbit(mx, my)
        // });
        this.controls.addEventListener('wheel', (event) => {
            // this.controls.enableZoom = false;
            // console.log(event.deltaY);
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
        });
        this.controls.addEventListener('mouse-down-right',(mx,my)=>{
            // 为了实现pane功能，取消场景的左右旋转（因为会有冲突，导致镜头的bug，镜头四处晃）
            // 初步判定为 maphelper里面，判定摄像机位置和绘图位置出现镜头方向的冲突，镜头方向的更新
            // 目前情况先禁用旋转以实现拖动的功能。
            this.fromX = mx;
            this.fromY = my;
            this.rightClick = true;
            console.log("down");
            console.log(mx,my);
        });
        this.controls.addEventListener("mouse-up", (mx,my)=>{
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
        });
    }

    _render() {
        this.resizeCanvas();
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        this.renderer.clearDepth();
        this.renderer.render(this.marker.scene, this.camera);
    }


    initComponents() {
        if (this.env.isDev) { Anim._addTestObjects(this, Threelet); } // dev
        // 场景初始化
        const grids = new THREE.Group();
        grids.add(this.scene.getObjectByName('walls'));
        grids.add(this.scene.getObjectByName('axes'));
        grids.name = 'singleton-grids';
        this.scene.add(grids);
        this.grids = grids;

        // 加载地形贴图

        const { origin, radius, zoom, vis, title } = App.resolveParams(this.env);
        const projection = loader.projection(origin, radius);

        this.origin = origin;
        this.radius = radius;
        this.zoom = zoom;
        this.vis = vis;
        this.projection = projection;
        this.wireframeMat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x999999 }); // wireframe 网格线
        // 根据title更新地形
        this.updateTerrain(title);
        // 增加点光源
        this.light = new Light({z:2});
        this.addLight();
        //点光初始化结束


    }
    
    static capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    
    // 清除灯光
    removeLight(){
        this.scene.remove(this.light.getAmbientLight());
        this.scene.remove(this.light.getSpotLight());
    }
    addLight(){
        this.scene.add(this.light.getSpotLight());
        this.scene.add(this.light.getAmbientLight());
    }

    // 清空贴图
    clearTerrainObjects() {
        this.renderer.dispose();

        this.loader.doneVec = false;
        this.loader.doneRgb = false;
        this.loader.clearRgbMaterials();
        this.loader.clearInteractives();
        this.scene.children
            .filter(obj => obj.name.startsWith('dem-'))
            .forEach(dem => {
                dem.parent.remove(dem);
                Loader.disposeObject(dem);
            });

        // this.orbit.updateAxis(null);
        // this.orbit.remove();
    }
    

    updateVisibility(vis) {
        this.vis = vis;
        this.scene.traverse(node => {
            if (!(node instanceof THREE.Mesh) &&
                !(node instanceof THREE.Line)) return;

            if (!node.name) return;

            if (node.name.startsWith('dem-rgb-')) {
                if (vis === 'satellite') {
                    const rgbMats = this.loader.getRgbMaterials();
                    if (node.name in rgbMats) {
                        node.material = rgbMats[node.name];
                        node.material.needsUpdate = true;
                        node.visible = true;
                    }
                } 
            }
        });
    }
    
    getLatLngByXY(mx, my){
        const isect = this.raycastInteractives(mx, my);
        const pt = isect.point;
        const { projInv, unitsPerMeter } = this.projection;
        const llTarget = projInv(pt.x, pt.y);
        const corrd = proj(llTarget);
        const coord = this._reverseCoord(1.0, [pt.x, pt.y], [bbox[0], bbox[3]], [bbox[2], bbox[1]]);
    
        console.log('corrd:', corrd);
        console.log('coord:', coord);
        return llTarget;
    }

    raycastInteractives(mx, my) {
        return this.loader.interact(meshes => this.raycastFromMouse(mx, my, meshes));
    }
    // 选定点并绘制射线
    pick(mx, my) {
        this.currentX = mx;
        this.currentY = my;
        this.position.copy(this.camera.position);
        return;
    }
}

export default App;