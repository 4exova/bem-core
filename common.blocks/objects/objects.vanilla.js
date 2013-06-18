modules.define('objects', function(provide) {

var hasOwnProperty = Object.prototype.hasOwnProperty;

provide({
    extend : function(target) {
        typeof target !== 'object' && (target = {});

        for(var i = 1, len = arguments.length; i < len; i++) {
            var obj = arguments[i];
            if(obj) {
                for(var key in obj) {
                    hasOwnProperty.call(obj, key) && (target[key] = obj[key]);
                }
            }
        }

        return target;
    },

    isEmpty : function(obj) {
        for(var key in obj) {
            if(hasOwnProperty.call(obj, key)) {
                return false;
            }
        }

        return true;
    },

    each : function(obj, fn, ctx) {
        for(var key in obj) {
            if(hasOwnProperty.call(obj, key)) {
                ctx? fn.call(ctx, obj[key], key) : fn(obj[key], key);
            }
        }
    }
});

});
