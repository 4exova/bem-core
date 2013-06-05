var BEM = require('bem'),
    Q = BEM.require('q');

exports.baseTechName = 'html';

exports.techMixin = {

    getCreateSuffixes : function() {
        return ['html'];
    },

    getBemhtml : function(prefix) {
        var path = this.getPath(prefix, 'bemhtml.js');
        return require(path).BEMHTML;
    },

    getBemjson : function(prefix) {
        var path = this.getPath(prefix, 'bemtree.xjst.js');
        return require(path).BEMTREE;
    },

    getHtml : function(bemhtml, bemjson) {
        var ctx = {};
        return Q.when(bemjson)
            .then(function(bemjson) {
                return [bemhtml, bemjson.call(ctx)];
            })
            .spread(function(bemhtml, bemjson) {
                return bemhtml.call(bemjson);
            });
    },

    getDependencies : function() {
        return ['bemtree.xjst', 'bemhtml'];
    }

};
