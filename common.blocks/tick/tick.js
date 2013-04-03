modules.define('tick', ['utils', 'events'], function(provide, utils, events) {

var TICK_INTERVAL = 50;

provide(new (utils.inherit(events.Emitter, {
    __constructor : function() {
        this._timer = null;
        this._isStarted = false;
    },

    start : function() {
        if(!this._isStarted) {
            this._isStarted = true;
            this._scheduleTick();
        }
    },

    stop : function() {
        if(this._isStarted) {
            this._isStarted = false;
            clearTimeout(this._timer);
        }
    },

    _scheduleTick : function() {
        this._timer = setTimeout(this._onTick.bind(this), TICK_INTERVAL);
    },

    _onTick : function() {
        this
            .trigger('tick')
            ._scheduleTick();
    }
}))());

});