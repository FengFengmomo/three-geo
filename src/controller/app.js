import Env from './env.js';
//import Env from './envs-ignore/env-dev.js';
//import Env from './envs-ignore/env-io.js';

// import MiniThreeLet from './miniThreeLet/MiniThreeLet.js';
import Threelet from '../../examples/deps/threelet/index.js';
import Light from './light.js';
import TileController from './tileController.js';
import Listeners from './listener.js';

const { THREE  } = window;
const { OrbitControls } = THREE;

class App extends Threelet {
    constructor() {
        super({ canvas: document.getElementById('viewer') ,optAxes: false});
    }

    onCreate(_params) { // override
        this.env = Env;

        this.camera.position.set(0, 0, 200); // 摄像机的xyz位置
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
        };
        this.setup('mod-controls', OrbitControls);
        this.render(); // first time
        this.tileController.defaultTile();
        // this._controls.enablePan = true;
        // this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this._controls.enablePan = true;
        this._controls.minPolarAngle = 0;
        this._controls.maxPolarAngle = Math.PI/3;
        // this._controls.minAzimuthAngle = 0;  
        // this._controls.maxAzimuthAngle = 0;
        // this._controls.enableRotate = true;

        // this.controls.addEventListener('mouse-move', (event) => this.listeners.mouseMove(event));
        // this._controls.addEventListener('wheel', (event) => this.listeners.wheel(event, this.camera.position));
        this.renderer.domElement.addEventListener('wheel', (event)=>{
            // position的改变
            // level的改变
            this.listeners.wheel(event, this.camera.position);
        });
        this.on('mouse-up', (event) => {
            this.loding(event, this.camera.position)
        });
        // this.controls.addEventListener('mouse-down-right',this.listeners.mouseDownRight(event));
        // this.controls.addEventListener("mouse-up", (event)=>{this.listeners.mouseUp(event)});
    }

    loding(event, position){
        let delta = event.deltaY;
        // 设置几个position界定缩放等级
        // 起始16 或者 18
        // 在加载贴图时要锁定摄像头position吗？
        // 采用递归树的方式进行加载
        // 如：14:级 256，256， 递归加载下级图片：256*2 256*2，256*2+1 256*2， 256*2 256*2+1 ，256*2+1 256*2+1
        this.zoom += delta>0?-1:1;
        if(this.zoom<0){
            
        }
        this.prePosition = position;
        this.idLording = true;
        // 开始加载
        // 禁止缩放
    }
    // 放大
    zoomIn(){

    }
    // 缩小
    zoomOut(){
        
    }

    _render() {
        this.resizeCanvas();
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        this.renderer.clearDepth();
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
        this.wireframeMat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x999999 }); // wireframe 网格线
        // 根据title更新地形
        // 增加点光源
        this.light = new Light({z:2});
        this.addLight();
        //点光初始化结束
        const refresh = () => { this._render(); };
        this.lod = new THREE.LOD();
        this.scene.add(this.lod);
        this.tileController = new TileController(this.scene,this.lod, refresh);
        this.listeners = new Listeners();
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
    
    
    
}

export default App;