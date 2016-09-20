/* eslint-disable */
'use strict';

module.exports = Marker;

var DOM = require('../util/dom');
var util = require('../util/util');
var LngLat = require('../geo/lng_lat');
var Point = require('point-geometry');
var Popup = require('./popup');

/**
 * Creates a marker component
 * @class Marker
 * @param {HTMLElement=} element DOM element to use as a marker (creates a div element by default)
 * @param {Object=} options
 * @param {PointLike=} options.offset The offset in pixels as a [`PointLike`](#PointLike) object to apply relative to the element's top left corner. Negatives indicate left and up.
 * @param {boolean=} [options.pitchScale=false] Whether the marker should scale smaller into the background or larger into the foreground when the map is pitched and rotated
 * @param {boolean=} [options.zoomScale=false] Whether the marker should scale with the map as you zoom in and out
 * @param {number=} [options.nativeZoom=map.getZoom()] The native zoom level of the marker. If the map is at this zoom the marker will not be scaled. If zoom is greater the marker will be enlarged. If zoom is less the marker will be shrunk.
 * @param {number=} [options.zoomFactor=1.6] The multiple by which to scale the size of the marker between each zoom level
 * @example
 * var marker = new mapboxgl.Marker()
 *   .setLngLat([30.5, 50.5])
 *   .addTo(map);
 */
function Marker(element, options) {
    this._offset = Point.convert(options && options.offset || [0, 0]);
    this._pitchScale = options && options.pitchScale || false;
    this._zoomScale = options && options.zoomScale || false;
    this._nativeZoom = options && options.nativeZoom || false;
    this._zoomFactor = options && options.zoomFactor || 1.6;

    this._update = this._update.bind(this);
    this._onMapClick = this._onMapClick.bind(this);

    if (!element) element = DOM.create('div');
    element.classList.add('mapboxgl-marker');
    this._element = element;

    this._popup = null;
}

Marker.prototype = {
    /**
     * Attaches the marker to a map
     * @param {Map} map
     * @returns {Marker} `this`
     */
    addTo: function (map) {
        this.remove();
        this._map = map;
        if(this._nativeZoom === false) this._nativeZoom = map.getZoom();
        map.getCanvasContainer().appendChild(this._element);
        map.on('move', this._update);
        this._update();

        // If we attached the `click` listener to the marker element, the popup
        // would close once the event propogated to `map` due to the
        // `Popup#_onClickClose` listener.
        this._map.on('click', this._onMapClick);

        return this;
    },

    /**
     * Removes the marker from a map
     * @example
     * var marker = new mapboxgl.Marker().addTo(map);
     * marker.remove();
     * @returns {Marker} `this`
     */
    remove: function () {
        if (this._map) {
            this._map.off('click', this._onMapClick);
            this._map.off('move', this._update);
            this._map = null;
        }
        DOM.remove(this._element);
        if (this._popup) this._popup.remove();
        return this;
    },

    /**
     * Get the marker's geographical location
     * @returns {LngLat}
     */
    getLngLat: function () {
        return this._lngLat;
    },

    /**
     * Set the marker's geographical position and move it.
     * @param {LngLat} lnglat
     * @returns {Marker} `this`
     */
    setLngLat: function (lnglat) {
        this._lngLat = LngLat.convert(lnglat);
        if (this._popup) this._popup.setLngLat(this._lngLat);
        this._update();
        return this;
    },

    getElement: function () {
        return this._element;
    },

    /**
     * Binds a Popup to the Marker
     * @param {Popup=} popup an instance of the `Popup` class. If undefined or null, any popup
     * set on this `Marker` instance is unset
     * @returns {Marker} `this`
     */

    setPopup: function (popup) {
        var that = this;

        if (this._popup) {
            this._popup.remove();
            this._popup = null;
        }

        if (popup) {
            this._popup = popup;
            this._popup.setLngLat(this._lngLat);
        }

        return this;
    },

    _onMapClick: function(event) {
        var targetElement = event.originalEvent.target;
        var element = this._element;

        if (this._popup && (targetElement === element || element.contains(targetElement))) {
            this.togglePopup();
        }
    },

    /**
     * Returns the Popup instance that is bound to the Marker
     * @returns {Popup} popup
     */
    getPopup: function () {
        return this._popup;
    },

    /**
     * Opens or closes the bound popup, depending on the current state
     * @returns {Marker} `this`
     */
    togglePopup: function () {
        var popup = this._popup;

        if (!popup) return;
        else if (popup.isOpen()) popup.remove();
        else popup.addTo(this._map);
    },

    _update: function () {
        if (!this._map) return;

        var projection = this._map.project3d(this._lngLat);
        var point = new Point(projection[0] / projection[3], projection[1] / projection[3]);

        var z = Math.round(point.y*10);
        var pos = point._add(this._offset);

        var t = 'translate(' + pos.x + 'px,' + pos.y + 'px)';

        var scale = 1;
        if(this._pitchScale) scale = this._map.transform._altitude/projection[3]; // adjust scale based on pitch+bearing
        if(this._zoomScale) scale *= Math.pow(this._zoomFactor, this._map.getZoom()-this._nativeZoom); // adjust scale based on map zoom
        t += ' scale(' + scale + ',' + scale + ')';

        DOM.setTransform(this._element, t);
        this._el.style.zIndex = z;
    }
};
