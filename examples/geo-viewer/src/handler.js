import { DomEvent, Util } from "leaflet";

class Handler{
    constructor(domElement, map){
        this.map = map;
		this.domElement = domElement;
			// @section Mousewheel options
		// @option scrollWheelZoom: Boolean|String = true
		// Whether the map can be zoomed by using the mouse wheel. If passed `'center'`,
		// it will zoom to the center of the view regardless of where the mouse was.
		this.scrollWheelZoom = true,

		// @option wheelDebounceTime: Number = 40
		// Limits the rate at which a wheel can fire (in milliseconds). By default
		// user can't zoom via wheel more often than once per 40 ms.
		this.wheelDebounceTime = 40,

		// @option wheelPxPerZoomLevel: Number = 60
		// How many scroll pixels (as reported by [L.DomEvent.getWheelDelta](#domevent-getwheeldelta))
		// mean a change of one full zoom level. Smaller values will make wheel-zooming
		// faster (and vice versa).
		this.wheelPxPerZoomLevel = 60
    }
    enable(){
        if (this._enabled) { return this; }

		this._enabled = true;
		this.addHooks();
		return this;
    }
    disable(){
        if (!this._enabled) { return this; }

		this._enabled = false;
		this.removeHooks();
		return this;
    }
    enabled(){
        return !!this._enabled;
    }
}
class ScrollWheelZoom extends Handler{
    
    addHooks(){
        this.domElement.addEventListener('wheel', this._onWheelScroll);

		this._delta = 0;
    }
    removeHooks(){
		this.domElement.removeEventListener('wheel', this._onWheelScroll);
    }
    _onWheelScroll(event){
		var delta = event.deltaY || event.deltaX;;

		var debounce = this._map.options.wheelDebounceTime;

		this._delta += delta;
		this._lastMousePos = this._map.mouseEventToContainerPoint(e);

		if (!this._startTime) {
			this._startTime = +new Date();
		}

		var left = Math.max(debounce - (+new Date() - this._startTime), 0);

		clearTimeout(this._timer);
		this._timer = setTimeout(Util.bind(this._performZoom, this), left);

		DomEvent.stop(event);
	}

	_performZoom() {
		var map = this._map,
		    zoom = map.getZoom(),
		    snap = 1 || 0;

		map._stop(); // stop panning and fly animations if any

		// map the delta with a sigmoid function to -4..4 range leaning on -1..1
		var d2 = this._delta / (this._map.options.wheelPxPerZoomLevel * 4),
		    d3 = 4 * Math.log(2 / (1 + Math.exp(-Math.abs(d2)))) / Math.LN2,
		    d4 = snap ? Math.ceil(d3 / snap) * snap : d3,
		    delta = map._limitZoom(zoom + (this._delta > 0 ? d4 : -d4)) - zoom;

		this._delta = 0;
		this._startTime = null;

		if (!delta) { return; }

		if (map.options.scrollWheelZoom === 'center') {
			map.setZoom(zoom + delta);
		} else {
			map.setZoomAround(this._lastMousePos, zoom + delta);
		}
	}
	_limitZoom: function (zoom) {
		var min = this.getMinZoom(),
		    max = this.getMaxZoom(),
		    snap = Browser.any3d ? this.options.zoomSnap : 1;
		if (snap) {
			zoom = Math.round(zoom / snap) * snap;
		}
		return Math.max(min, Math.min(max, zoom));
	},
}