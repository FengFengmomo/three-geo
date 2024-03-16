import 'regenerator-runtime/runtime.js';

import * as THREE from 'three';
import SkyHelper from './SkyHelper.js';
import Utils from './Utils.js';

class MiniThreeLet{
    constructor(params){
        const defaults = {
            canvas: null,
            width: 480,
            height: 320,
            // ---- viewer options ----
            optScene: null,
            optAxes: true, // axes and a unit lattice
            optCameraPosition: [0, 1, 2], // initial camera position in desktop mode
        };
        const actual = Object.assign({}, defaults, params);
        this.domElement = null;
        let canvas = actual.canvas;
        if (! canvas) {
            // <div style="display: inline-block; position: relative;">
            //     <canvas style="width: 480px; height: 320px;"></canvas>
            // </div>
            canvas = document.createElement('canvas');
            this._applySizeStyle(canvas, actual);
            const div = document.createElement('div');
            Object.assign(div.style, {
                display: 'inline-block',
                position: 'relative',
            });
            div.appendChild(canvas);
            this.domElement = div;
        } else {
            if (params.width !== undefined && params.height !== undefined) {
                _applySizeStyle(canvas, params);
            }
        }
        this.canvas = canvas;

        [this.scene, this.camera, this.renderer] =
            Threelet._initBasics(canvas, actual);
        this.resizeCanvas(true); // first time
        
        // raycasting
        this._raycaster = new THREE.Raycaster();;

        // rendering loop and scene logic update
        this.clock = new THREE.Clock();
        this.timeLast = this.clock.getElapsedTime();
        this.iid = null;
        this.update = null;

        // plugin module table
        this.modTable = {
            'mod-controls': this._setupControls,
            'mod-stats': this._setupStats,
            'mod-sky': this._setupSky,
        };
        // for controls module
        this._controls = null;

        // for stats module
        this._stats = null;

        // for sky module
        this.skyHelper = null;
        this.onCreate(params);
    }
    onCreate(params) {
        this.render(); // _first _time
    }

    render(isPresenting=false){
        // console.log('@@ render(): isPresenting:', isPresenting);
        if (this._stats) { this._stats.update(); }
        if (! isPresenting) { this.resizeCanvas(); }
        this.renderer.render(this.scene, this.camera);
    }

    _applySizeStyle(_canvas, _params){
        Object.assign(_canvas.style, {
            width: typeof _params.width === 'string' ?
                _params.width : `${_params.width}px`,
            height: typeof _params.height === 'string' ?
                _params.height : `${_params.height}px`,
        });
    }
    // plugin module setup function
    setup(modTitle, Module, opts={}) {
        if (modTitle in this.modTable) {
            return this.modTable[modTitle].bind(this)(Module, opts);
        } else {
            console.warn('setup(): unsupported module title:', modTitle);
        }
    }
    _setupControls(Module, opts) {
        this._controls = new Module(this.camera, this.renderer.domElement);
        this._controls.addEventListener('change', this.render.bind(null, false));
        return this._controls;
    }
    _setupStats(Module, opts) {
        const defaults = {
            panelType: 0, // 0: fps, 1: ms, 2: mb, 3+: custom
            appendTo: this.domElement ? this.domElement : document.body,
        };
        const actual = Object.assign({}, defaults, opts);

        const stats = this._stats = new Module();
        stats.showPanel(actual.panelType);
        if (actual.appendTo !== document.body) {
            stats.dom.style.position = 'absolute';
        }
        actual.appendTo.appendChild(stats.dom);
        return this._stats;
    }
    getSkyHelper() { return this.skyHelper; }

    _setupSky(Module, opts) {
        this.skyHelper = new SkyHelper(Module);
        // console.log('@@ this.skyHelper:', this.skyHelper);

        const sky = this.skyHelper.init();
        this.scene.add(sky);
        this.skyHelper.updateUniforms({
            //==== yingyang
            turbidity: 5.2,
            rayleigh: 0.01,
            mieCoefficient: 0.002,
            mieDirectionalG: 0.9,
            inclination: 0.1,
            azimuth: 0.3,
            //====
        });
        return sky;
    }
    updateMechanics() { // update for the scene logic
        const time = this.clock.getElapsedTime();
        const dt = time - this.timeLast;
        this.timeLast = time;
        (this.update ? this.update : this.onUpdate.bind(this))(time, dt);
    }

    updateLoop(fps) {
        if (this.iid !== null) {
            // console.log('@@ updateLoop(): clearing interval:', this.iid);
            clearInterval(this.iid);
        }

        if (fps === 0) {
            return; // stop the loop
        } else if (fps < 0) { // start the vr loop
            this.renderer.setAnimationLoop(() => {
                if (! this.renderer.xr.isPresenting) {
                    this.renderer.setAnimationLoop(null); // stop the vr loop
                    console.log('@@ transition back to desktop');

                    this.render(); // move one tick to refresh the buffer

                    // console.log('fps last:', this._fpsDesktopLast);
                    return this.updateLoop(this._fpsDesktopLast);
                }

                this.render(true);
                this.updateMechanics();
                // DEPRECATED - valid only for WebVR 1.1
                // this._vrcHelper.updateControllers();
            });
            return;
        }

        // FIXME for this naive dev version, not looping with rAF()...
        this._fpsDesktopLast = fps;
        this.iid = setInterval(() => {
            this.render(); // make sure image dump is available; https://stackoverflow.com/questions/30628064/how-to-toggle-preservedrawingbuffer-in-three-js
            this.updateMechanics();
        }, 1000/fps);
        // console.log('@@ updateLoop(): new interval:', this.iid);
    }
    static _initBasics(canvas, opts) {
        const camera = new THREE.PerspectiveCamera(75, canvas.width/canvas.height, 0.001, 1000);
        camera.position.set(...opts.optCameraPosition);
        camera.up.set(0, 1, 0); // important for OrbitControls

        const renderer = new THREE.WebGLRenderer({
            // alpha: true,
            canvas: canvas,
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        console.log('renderer:', renderer);

        // init basic objects --------
        const scene = opts.optScene ? opts.optScene : new THREE.Scene();

        if (opts.optAxes) {
            const { walls, axes } = this.createAxes();
            scene.add(walls, axes);
        }

        return [scene, camera, renderer];
    }
    static createAxes() {
        const walls = Utils.createLineBox([1, 1, 1], 0xcccccc);
        walls.position.set(0, 0, 0);
        walls.name = 'walls';
        const axes = new THREE.AxesHelper(1);
        axes.name = 'axes';
        return { walls, axes };
    }

    resizeCanvas(force=false) {
        Threelet._resizeCanvasToDisplaySize(
            this.canvas, this.renderer, this.camera, force);
    }
    // https://stackoverflow.com/questions/29884485/threejs-canvas-size-based-on-container
    static _resizeCanvasToDisplaySize(canvas, renderer, camera, force=false) {
        let width = canvas.clientWidth;
        let height = canvas.clientHeight;

        // adjust displayBuffer size to match
        if (force || canvas.width != width || canvas.height != height) {
            // you must pass false here or three.js sadly fights the browser
            // console.log "resizing: #{canvas.width} #{canvas.height} -> #{width} #{height}"
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
    };
    static getInputCoords(e, canvas) {
        // console.log('@@ e:', e, e.type);
        // https://developer.mozilla.org/en-US/docs/Web/API/Touch/clientX
        let x, y;
        if (e.type === 'touchend') {
            [x, y] = [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
        } else if (e.type === 'touchstart' || e.type === 'touchmove') {
            [x, y] = [e.touches[0].clientX, e.touches[0].clientY];
        } else {
            [x, y] = [e.clientX, e.clientY];
        }
        // console.log('getInputCoords(): x, y:', x, y);

        // https://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element/18053642#18053642
        const rect = canvas.getBoundingClientRect();
        const [mx, my] = [x - rect.left, y - rect.top];
        // console.log('getInputCoords():', mx, my, canvas.width, canvas.height);
        return [mx, my];
    }
    capture() {
        // Without this pre-rendering, on the Silk browser,
        // the result is blacked out second time in successive captures.
        // Also relevant to this -- https://stackoverflow.com/questions/30628064/how-to-toggle-preservedrawingbuffer-in-three-js
        this.render();

        Utils.capture(this.renderer.domElement);
    }
    dispose() {
        this.onDestroy();

        this.updateLoop(0); // stop the loop
        this.update = null;

        if (this._controls) {
            this._controls.dispose();
            this._controls = null;
        }

        if (this._stats) {
            this._stats.dom.remove();
        }

        if (this._vrButton) {
            this._vrButton.remove();
        }
        if (this._arButton) {
            this._arButton.remove();
        }

        // this also ensures releasing memory for objects freed by freeScene()
        this.renderer.dispose();
        this.renderer = null;

        // recursively release child objects in the scene
        Threelet.freeScene(this.scene);
        this.scene = null;

        this.camera = null;
    }
    clearScene(opts={}) {
        const defaults = {
            needAxes: false,
        };
        const actual = Object.assign({}, defaults, opts);

        if (! this.scene) return;

        // clear objs in the scene
        this.renderer.dispose();
        Threelet.freeScene(this.scene);

        if (actual.needAxes) {
            const { walls, axes } = Threelet.createAxes();
            this.scene.add(walls, axes);
        }
    }
    static freeScene(scene) {
        this.freeChildObjects(scene, scene.children);
    }

    static freeChildObjects(_parent, _children) {
        while (_children.length > 0) {
            let ch = _children[0];
            this.freeChildObjects(ch, ch.children);
            console.log('@@ freeing: one obj:', ch.name);
            console.log(`@@ freeing obj ${ch.uuid} of ${_parent.uuid}`);
            _parent.remove(ch);
            this.disposeObject(ch);
            ch = null;
        }
    }
    static disposeObject(obj) { // https://gist.github.com/j-devel/6d0323264b6a1e47e2ee38bc8647c726
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) this.disposeMaterial(obj.material);
        if (obj.texture) obj.texture.dispose();
    }
    static disposeMaterial(mat) {
        if (mat.map && typeof mat.map.dispose === 'function') mat.map.dispose();
        if (mat && typeof mat.dispose === 'function') mat.dispose();
    }
}
MiniThreeLet.Utils = Utils;
export default MiniThreeLet;