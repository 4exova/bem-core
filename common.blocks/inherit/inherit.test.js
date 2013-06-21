modules.define('test', ['inherit'], function(provide, inherit) {

describe('inherit', function() {
    it('instance should be instance of class', function() {
        var Cls = inherit({}),
            instance = new Cls();

        instance.should.be.instanceOf(Cls);
    });

    it('instance should be instance of all classes in hierarchy', function() {
        var ClsA = inherit({}),
            ClsB = inherit(ClsA, {}),
            ClsC = inherit(ClsB, {}),
            instance = new ClsC();

        instance.should.be.instanceOf(ClsA);
        instance.should.be.instanceOf(ClsB);
        instance.should.be.instanceOf(ClsC);
    });

    it('instance should be instance of constructor return value', function() {
        var ClsA = inherit({}),
            ClsB = inherit({
                __constructor : function() {
                    return new ClsA();
                }
            }),
            instance = new ClsB();

        instance.should.be.instanceOf(ClsA);
        instance.should.not.be.instanceOf(ClsB);
    });

    it('instance should have properties from constructor', function() {
        var Cls = inherit({
                __constructor : function() {
                    this._p1 = 'v1';
                    this._p2 = 'v2';
                }
            }),
            instance = new Cls();

        instance._p1.should.be.equal('v1');
        instance._p2.should.be.equal('v2');
    });

    it('instance "__self" property should be pointed to class', function() {
        var Cls = inherit({}),
            instance = new Cls();

        instance.__self.should.be.equal(Cls);
    });

    it('should override methods of base class', function() {
        var ClsA = inherit({
                method1 : function() {
                    return 'A1';
                },
                method2 : function() {
                    return 'A2';
                }
            }),
            ClsB = inherit(ClsA, {
                method1 : function() {
                    return 'B1';
                }
            }),
            ClsC = inherit(ClsB, {
                method2 : function() {
                    return 'C2';
                }
            }),
            instance = new ClsC();

        instance.method1().should.be.equal('B1');
        instance.method2().should.be.equal('C2');
    });

    it('__base should call methods of base class', function() {
        var ClsA = inherit({
                method1 : function() {
                    return 'A1';
                },
                method2 : function() {
                    return 'A2';
                }
            }),
            ClsB = inherit(ClsA, {
                method1 : function() {
                    return this.__base() + 'B1';
                }
            }),
            ClsC = inherit(ClsB, {
                method1 : function() {
                    return this.__base() + 'C1';
                },

                method2 : function() {
                    return this.__base() + 'C2';
                }
            }),
            instance = new ClsC();

        instance.method1().should.be.equal('A1B1C1');
        instance.method2().should.be.equal('A2C2');
    });
});

provide();

});