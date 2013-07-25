var BEM = require('bem'),
    Q = BEM.require('q'),
    Tech = require('bem/lib/tech').TechV2,
    Deps = require('bem/lib/techs/v2/deps.js').Deps,
    PATH = require("path"),
    bemUtil = require("bem/lib/util"),
    __assert = require("assert");

var dbg = 1;

exports.baseTech = Tech;

exports.techMixin = {

    getWeakBuildSuffixesMap:function(){
        return {"js":["browser.js","vanilla.js","js","bemhtml"]};
    },

    getBuildSuffixesMap:function(){
        return {"js":["browser.js","js"]};
    },

    transformBuildDecl: function(decl) {
        var bb = this.getWeakBuildSuffixesMap();
        var ss = this.getWeakSuffixesMap();

        return decl
            .then(function(decl){
                var deps = new Deps().parseDepsDecl(decl)
                    .filter(function(dependson, dependent) {
                        return (((dependson.item.tech in ss) && dependent.item.tech in bb)
                          || (!dependson.item.tech && !dependent.item.tech))
                    }).map(function(item){
                        return item.item;
                    });
                return {deps: deps};
            });
    },

    getBuildResult:function(files, suffix, output, opts){
        __assert(suffix === "js")

        var bemhtmlTech = this.context.createTech("bemhtml");
        var browserTech = this.context.createTech("browser.js");

        var decl = this.transformBuildDecl(this.context.opts.declaration);

        __assert(bemhtmlTech.API_VER === 2 && browserTech.API_VER === 2,
                 this.getTechName() + ' can’t use v1 bemhtml tech to concat bemhtml content. Configure level to use v2 bemhtml.')

        opts = {__proto__:opts, force:true};

        return Q.all(
            [
                bemhtmlTech.getBuildResults(
                    bemhtmlTech.transformBuildDecl(decl),
                    this.context.getLevels(),output,opts),
                browserTech.getBuildResults(
                    browserTech.transformBuildDecl(decl),
                    this.context.getLevels(),output,opts)])
            .spread(function(bemhtml,browser){
                var result = browser.js;
                result.unshift(bemhtml['bemhtml.js']+'\n');
                return result;
            })
    }

};
