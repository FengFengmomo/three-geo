import Env from './env.js';
//import Env from './envs-ignore/env-dev.js';
//import Env from './envs-ignore/env-io.js';

import Threelet from '../../deps/threelet.esm.js';
// import Threelet from '../../deps/threelet/index.js';
import GuiHelper from './gui-helper.js';
import MediaHelper from './media.js';
import Monitor from './monitor.js';
import Loader from './loader.js';
import Laser from './laser.js';
import Marker from './marker.js';
import Light from './light.js';
import Utils from './utils.js';

const { THREE  } = window;
const { OrbitControls } = THREE;

class App extends Threelet {
    constructor() {
        super({ canvas: document.getElementById('viewer') ,optAxes: false});
    }

    onCreate(_params) { // override
        this.env = Env;

        this.camera.position.set(0, 0, 0.8);
        this.camera.up.set(0, 0, 1); // 摄像头方向，沿着z轴正方向
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
        this.gui = App.createGui(this.guiCallbacks(), this.env, this.monitor.dom);

        this.monitor.updateTerrain(this.origin, this.zoom);
        // this.monitor.updateMap(this.map.getZoom());
        this.monitor.updateCam(this.camera, this.projection);
        // this.map.plotCam(this.camera);
        // this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        // new THREE.Spherical
        // this.controls.minPolarAngle = 0;
        // this.controls.maxPolarAngle = Math.PI/3;
        // this.controls.minAzimuthAngle = 0;  
        // this.controls.maxAzimuthAngle = 0; 

        this.on('pointer-move', (mx, my) => this.pick(mx, my));
        // this.on('pointer-click', (mx, my) => this.updateMeasure(mx, my));
        // this.on('pointer-click-right', (mx, my) => {
            // console.log("click complete");
            // this.updateOrbit(mx, my)
        // });
        this.renderer.domElement.addEventListener('wheel', (event) => {
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

            Utils.preventDefault(event); // 停止事件传播
	        Utils.stopPropagation(event);
        });
        this.on('pointer-down-right',(mx,my)=>{
            // 为了实现pane功能，取消场景的左右旋转（因为会有冲突，导致镜头的bug，镜头四处晃）
            // 初步判定为 maphelper里面，判定摄像机位置和绘图位置出现镜头方向的冲突，镜头方向的更新
            // 目前情况先禁用旋转以实现拖动的功能。
            this.fromX = mx;
            this.fromY = my;
            this.rightClick = true;
            console.log("down");
            console.log(mx,my);
        });
        this.on("pointer-up", (mx,my)=>{
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

        const loader = new Loader(this.scene, this.env);
        const { origin, radius, zoom, vis, title } = App.resolveParams(this.env);
        const projection = loader.projection(origin, radius);

        this.loader = loader;
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

        this.monitor = new Monitor(this.env);
        // 初始化mapHelper 功能上不再需要maphelper
        // this.map = new MapHelper({
        //     dom: document.getElementById('map'),
        //     domWrapper: document.getElementById('map-wrapper'),
        //     origin, radius, projection,
        //     enableTiles: this.env.enableTilesLeaflet === true,
        //     onBuildTerrain: ll => {
        //         this.reloadPageWithLocation(ll, App.parseQuery().title);
        //     },
        //     onMapZoomEnd: zoom => {
        //         this.monitor.updateMap(zoom);
        //         this.map.plotCam(this.camera);
        //     },
        // });

        // 初始化mediaHelper
        this.media = new MediaHelper(
            document.getElementById('media'),
            document.getElementById('media-wrapper'));

        //

        this.laser = new Laser(this.scene, this.camera); // 
        // this.orbit = new Orbit(this.scene); // 相机运动控件
        this.marker = new Marker(new THREE.Scene()); // 
    }
    // 处理参数
    static resolveParams(env) {
        const { origin, mode, title } = this.parseQuery();
        const vis = mode.toLowerCase();

        // https://docs.mapbox.com/data/tilesets/guides/access-elevation-data/#mapbox-terrain-rgb
        // vector dem: 9--15 (at 8, no contour data returned)
        //    rbg dem: ?--15
        const zoom = env.zoom || 13; // satellite zoom resolution -- min: 11, defaut: 13, max: 17
        const radius = 5.0 * 2**(13 - zoom);

        return { origin, radius, zoom, vis, title };
    }
    // 转换 query内容， 默认返回经纬度[ -33.9625, 18.4107 ], 'Table Mountain'
    static parseQuery() {
        const params = new URLSearchParams(document.location.search);
        const lat = params.get('lat');
        const lng = params.get('lng');
        const md = params.get('mode');
        const ttl = params.get('title');

        // const fallback = [ [ 36.2058, -112.4413 ], 'Colorado River' ];
        const fallback = [ [43.85, 86.40], 's101' ];

        const [ origin, title ] = (lat && lng) ?
            [ [ Number(lat), Number(lng) ], ttl ] : fallback;
        const mode = this.capitalizeFirst((md || 'Satellite').toLowerCase());

        return { origin, title, mode };
    }

    static capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // 创建GUI
    static createGui(cbs, env, monitorDom) {
        const { mode, title } = this.parseQuery();
        const defaults = {
            isDev: () => {},
            mode,
            capture: () => {},
            grids: true,
            autoOrbit: false,
            vrLaser: false,
            reset: () => {},
            loc: title ? title.replace('_', ' ') : '',
            leaflet: true,
            media: false,
            sourceCode: () => {},
        };

        const gh = new GuiHelper(env)
            .setDefaults(defaults)
            .setCallbacks(cbs)
            .appendToFooter(monitorDom);

        if (env.isGuiClosed) {
            gh.close();
        }

        return gh;
    }
    // 监听函数
    guiCallbacks() {
        return {
            onChangeMode: mode => {
                this._updateTerrain(mode.toLowerCase());
            },
            onCapture: () => {
                this.capture();
            },
            onChangeGrids: tf => {
                this.grids.visible = tf;
                this.render();
            },
            onChangeAutoOrbit: tf => {
                // this.orbit.active = tf;
                if (tf) {
                    const pt = new THREE.Vector3(0, 0, 0);
                    // this.orbit.updateAxis(pt);
                    // this.orbit.add(this.camera, pt);
                    // this.map.plotOrbit(this.orbit.data()); // 自动旋转时调用，相机的角度发生了变化
                }
            },
            onChangeVrLaser: tf => {
                this.laser.active = tf;
            },
            onChangeLeaflet: tf => {
                // this.map.toggle(tf);
            },
            onChangeMedia: tf => {
                this.media.toggle(tf);
            },
            onChangeLoc: (value, locations) => {
                if (value === '(none)') { // dummy case
                    return;
                }

                if (value in locations) {
                    this.reloadPageWithLocation(
                        locations[value], value.replace(' ', '_'));
                }
            },
        };
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
        // this.map.plotOrbit(null); // 清空时调用
        if (this.gui) {
            this.gui.setAutoOrbit(false);
        }

        this.marker.updateTmp(null);
        this.marker.marks().forEach(mark => {
            mark.parent.remove(mark);
            Loader.disposeObject(mark);
        });
    }
    // 重新加载页面，从link里面获取经纬度和title
    reloadPageWithLocation(ll, title) {
        let href = `./index.html?lat=${ll[0]}&lng=${ll[1]}`;
        if (title) {
            href += `&title=${title}`;
        }

        if (0) {
            window.location.href = href; // deprecated
        } else {
            // https://stackoverflow.com/questions/35395485/change-url-without-refresh-the-page/35395594
            // window.history.pushState(null, '', href);
            window.history.replaceState(null, '', href);
            this.removeLight();
            this.clearTerrainObjects();
            this.render();
            if (this.env.isDev) {
                console.log('======== ========');
                console.log('this:', this);
                console.log('this.scene.children:', this.scene.children);
                console.log('this.marker.scene.children:', this.marker.scene.children);
                console.log('======== ========');
            }

            const proj = this.loader.projection(ll, this.radius);
            // this.map.update(ll, proj);
            // this.map.plotCam(this.camera);
            this.monitor.updateTerrain(ll, this.zoom);

            this.origin = ll;
            this.projection = proj;
            this.addLight();
            this.updateTerrain(title);
        }
    }

    updateTerrain(title) {
        if (this.env.isDev) {
            this.loader.setDebugApis(title);
        }

        this._updateTerrain(this.vis);
    }

    static isTokenSet(token) {
        if (token !== '********') return true;

        const msg = 'Please set a valid Mapbox token in env.js';
        console.warn(msg);
        alert(msg);
        return false;
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
                } else if (vis === 'wireframe') {
                    node.material = this.wireframeMat;
                    node.material.needsUpdate = true;
                    node.visible = true;
                } else if (vis === 'contours') {
                    node.visible = false;
                }
            } else if (node.name.startsWith('dem-vec-')) {
                node.visible = vis === 'contours';
            }
        });
    }

    async _updateTerrain(vis) {
        const refresh = () => {
            this.updateVisibility(vis);
            this.render();
        };

        if (!App.isTokenSet(this.env.tokenMapbox)) {
            return refresh();
        }

        const { origin, radius, zoom } = this;
        try {
            if (vis === 'contours' && !this.loader.doneVec) {
                await this.loader.getVecTerrain(origin, radius, zoom, refresh);
            } else if (vis !== 'contours' && !this.loader.doneRgb) {
                await this.loader.getRgbTerrain(origin, radius, zoom, refresh);
            } else {
                refresh();
            }
        } catch (err) {
            console.error('_updateTerrain(): err:', err);
        }
    }
    // 计算三维地图上两点之间距离
    updateMeasure(mx, my) {
        const isect = this.raycastInteractives(mx, my);
        if (isect !== null) {
            this.marker.update(isect.point);
        } else {
            this.marker.updateTmp(null);
        }

        if (this.gui && !this.gui.data.autoOrbit) {
            this.render();
        }

        this.monitor.updateMeasure(this.marker.pair, this.projection);
    }
    // 右键点击时 添加射线，计算相交点
    updateOrbit(mx, my) {
        const isect = this.raycastInteractives(mx, my);
        if (isect !== null) {
            console.log('(orbit) mesh hit:', isect.object.name);

            const pt = isect.point;
            // this.orbit.updateAxis(pt);
            // this.orbit.remove();
            // this.orbit.add(this.camera, pt);
            // this.map.plotOrbit(this.orbit.data()); 
        } else {
            console.log('(orbit) no isects');

            // this.orbit.updateAxis(null);
            // this.orbit.remove();
            // this.map.plotOrbit(null); 

            if (this.gui) {
                this.gui.setAutoOrbit(false);
            }
        }

        if (this.gui && !this.gui.data.autoOrbit) {
            this.render();
        }
    }

    getLatLngByXY(mx, my){
        const isect = this.raycastInteractives(mx, my);
        const pt = isect.point;
        const { projInv, unitsPerMeter } = this.projection;
        const llTarget = projInv(pt.x, pt.y);
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
        if (!this.laser.active && this.marker.pair.length !== 1) {
            return;
        }

        const isect = this.raycastInteractives(mx, my);
        if (isect !== null) {
            const pt = isect.point;

            this.laser.prepare();
            if (this.laser.active) {
                this.loader.interact(meshes => this.laser.shoot(pt, meshes));
            }

            this.marker.pick(pt);
        } else {
            this.laser.clear();
        }

        if (this.gui && !this.gui.data.autoOrbit) {
            this.render();
        }
    }
}

export default App;