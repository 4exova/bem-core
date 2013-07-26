modules.define(
    'test',
    ['i-bem__dom', 'objects', 'jquery', 'sinon', 'BEMHTML'],
    function(provide, DOM, objects, $, sinon, BEMHTML) {

describe('i-bem__dom', function() {
    describe('getMod', function() {
        it('should return properly extracted mod from html', function() {
            DOM.decl('block', {});

            var rootNode;
            [
                {
                    cls : '',
                    val : ''
                },
                {
                    cls : 'block_m1_v1',
                    val : 'v1'
                },
                {
                    cls : 'block_m1_v1 bla-block_m1_v2',
                    val : 'v1'
                },
                {
                    cls : 'bla-block_m1_v2 block_m1_v1',
                    val : 'v1'
                },
                {
                    cls : 'block_m1',
                    val : true
                }
            ].forEach(function(data) {
                (rootNode = $('<div class="' + data.cls + '"/>')).bem('block').getMod('m1')
                    .should.be.eql(data.val);
                DOM.destruct(rootNode);
            });

            delete DOM.blocks['block'];
        });
    });

    describe('getMods', function() {
        it('should return properly extracted block mods from html', function() {
            DOM.decl('block', {});

            var rootNode;
            [
                {
                    cls  : '',
                    mods : { js : 'inited' }
                },
                {
                    cls  : 'block_m1_v1',
                    mods : { js : 'inited', m1 : 'v1' }
                },
                {
                    cls  : 'block_m1_v1 block_m2_v2 bla-block_m4_v3 block_m4_v4',
                    mods : { js : 'inited', m1 : 'v1', m2 : 'v2', m4 : 'v4' }
                },
                {
                    cls  : 'bla-block_m1_v1 block_m2_v2 block_m3_v3 bla-block_m3_v4 block_m4',
                    mods : { js : 'inited', m2 : 'v2', m3 : 'v3', m4 : true }
                }
            ].forEach(function(data) {
                (rootNode = $('<div class="' + data.cls + '"/>')).bem('block').getMods()
                    .should.be.eql(data.mods);
                DOM.destruct(rootNode);
            });

            delete DOM.blocks['block'];
        });

        it('should return properly extracted elem mods from html', function() {
            DOM.decl('block', {});

            var rootNode;
            [
                {
                    cls  : 'block__e1_m1_v1',
                    mods : { m1 : 'v1' }
                },
                {
                    cls  : 'block__e1_m1_v1 block__e1_m2_v2 bla-block__e1_m4_v3 block__e1_m4_v4',
                    mods : { m1 : 'v1', m2 : 'v2', m4 : 'v4' }
                },
                {
                    cls  : 'bla-block__e1_m1_v1 block__e1_m2_v2 block__e1_m3_v3 bla-block__e1_m3_v4 block__e1_m4',
                    mods : { m2 : 'v2', m3 : 'v3', m4 : true }
                }
            ].forEach(function(data) {
                var block = (rootNode = $('<div class="block block__e1 ' + data.cls + '"/>')).bem('block');
                block.getMods(block.elem('e1')).should.be.eql(data.mods);
                DOM.destruct(rootNode);
            });

            delete DOM.blocks['block'];
        });
    });

    describe('setMod', function() {
        it('should properly set CSS classes', function() {
            DOM.decl('block', {});

            var rootNode;
            [
                {
                    cls  : ['block_m1_v1'],
                    mods : { m1 : 'v1' }
                },
                {
                    cls  : ['block_m1_v1', 'block_m2_v2', 'block_m3', 'block_m4_v4', 'block_m5'],
                    mods : { m1 : 'v1', m2 : 'v2', m3 : true, m4 : 'v4', m5 : true  }
                }
            ].forEach(function(data) {
                var block = (rootNode = $('<div class="bla-block"/>')).bem('block');

                objects.each(data.mods, function(modVal, modName) {
                    block.setMod(modName, modVal);
                });

                data.cls.forEach(function(cls) {
                    block.domElem.hasClass(cls);
                });

                DOM.destruct(rootNode);
            });

            delete DOM.blocks['block'];
        });
    });

    describe('elemify', function() {
        var rootNode, instance;
        beforeEach(function() {
            DOM.decl('block', {});
            rootNode = DOM.init($(BEMHTML.apply({
                block : 'block',
                js : true,
                content : { elem : 'e1', mix : { elem : 'e2' }}})));
            instance = rootNode.bem('block');
        });
        afterEach(function() {
            DOM.destruct(rootNode);
            delete DOM.blocks['block'];
        });

        it('shouldn\'t change given elem', function() {
            var elem1 = instance.elem('e1');
            instance.elemify(elem1, 'e2');
            instance.__self._extractElemNameFrom(elem1).should.be.equal('e1');
        });

        it('should return', function() {
            var elem = instance.elemify(instance.elem('e1'), 'e2');
            instance.__self._extractElemNameFrom(elem).should.be.equal('e2');
        });
    });

    describe('findBlocksInside', function() {
        function getBlockIds(blocks) {
            return blocks.map(function(block) {
                return block.params.id;
            });
        }

        var rootNode, rootBlock;
        beforeEach(function() {
            rootNode = $(BEMHTML.apply(
                {
                    block : 'root',
                    content : {
                        block : 'b1',
                        js    : { id : '1' },
                        content : [
                            { block : 'b2' },
                            {
                                block : 'b1',
                                mods  : { m1 : 'v1' },
                                js    : { id : '2' }
                            },
                            {
                                block : 'b3',
                                content : {
                                    block   : 'b1',
                                    mods    : { m1 : 'v2' },
                                    js      : { id : '3' },
                                    content : {
                                        block : 'b1',
                                        mods  : { m1 : true },
                                        js    : { id : '4' }
                                    }
                                }
                            }
                        ]
                    }
                }));
            rootBlock = DOM.init(rootNode).bem('root');
        });

        afterEach(function() {
            DOM.destruct(rootNode);
            delete DOM.blocks['b-root'];
            delete DOM.blocks['b1'];
        });

        it('should find all blocks by name', function() {
            getBlockIds(rootBlock.findBlocksInside('b1')).should.be.eql(['1', '2', '3', '4']);
        });

        it('should find all blocks by name, modName and modVal', function() {
            getBlockIds(rootBlock.findBlocksInside({ block : 'b1', modName : 'm1', modVal : 'v1' }))
                .should.be.eql(['2']);
        });

        it('should find all blocks by name and boolean mod', function() {
            getBlockIds(rootBlock.findBlocksInside({ block : 'b1', modName : 'm1', modVal : true }))
                .should.be.eql(['4']);
        });
    });

    describe('DOM.init', function() {
        it('should init block', function() {
            var spy = sinon.spy();
            DOM.decl('block', {
                onSetMod : {
                    js : {
                        inited : spy
                    }
                }
            });

            var rootNode = DOM.init($(BEMHTML.apply({
                    tag : 'div',
                    content : { block : 'block', js : true }})));

            spy.called.should.be.true;

            DOM.destruct(rootNode);
            delete DOM.blocks['block'];
        });

        it('shouldn\'t init live block', function() {
            var spy = sinon.spy();
            DOM.decl('block', {
                onSetMod : {
                    js : {
                        inited : spy
                    }
                }
            }, {
                live : true
            });

            var rootNode = DOM.init($(BEMHTML.apply({
                    tag : 'div',
                    content : { block : 'block', js : true }})));

            DOM.init(rootNode);
            spy.called.should.be.false;

            DOM.destruct(rootNode);
            delete DOM.blocks['block'];
        });
    });

    describe('DOM.destruct', function() {
        it('should destruct block only if it has no dom nodes', function() {
            var spy = sinon.spy();
            DOM.decl('block', {
                onSetMod : {
                    js : {
                        '' : spy
                    }
                }
            });

            var rootNode = DOM.init($(BEMHTML.apply({
                    tag : 'div',
                    content : [
                        { block : 'block', js : { id : 'block' }},
                        { block : 'block', js : { id : 'block' }}
                    ]})));

            DOM.destruct(rootNode.find('.block:eq(0)'));
            spy.called.should.be.false;

            DOM.destruct(rootNode.find('.block'));
            spy.called.should.be.true;

            DOM.destruct(rootNode);
            delete DOM.blocks['block'];
        });

        it('should destruct implicitly inited block', function() {
            var spy = sinon.spy();
            DOM.decl('imp-block', {
                onSetMod : {
                    js : {
                        '' : spy
                    }
                }
            });

            var blockNode = DOM.init($(BEMHTML.apply({ block : 'imp-block' })));
            blockNode.bem('imp-block');
            DOM.destruct(blockNode);
            spy.should.have.been.calledOnce;

            delete DOM.blocks['imp-block'];
        });
    });

    describe('DOM.update', function() {
        it('should update tree', function() {
            var spyBlock1Destructed = sinon.spy(),
                spyBlock2Inited = sinon.spy();

            DOM.decl('block1', {
                onSetMod : {
                    js : {
                        '' : spyBlock1Destructed
                    }
                }
            });
            DOM.decl('block2', {
                onSetMod : {
                    js : {
                        inited : spyBlock2Inited
                    }
                }
            });

            var rootNode = DOM.init($(BEMHTML.apply({
                    tag : 'div',
                    content : { block : 'block1', js : true }})));

            DOM.update(rootNode, BEMHTML.apply({ block : 'block2', js : true }));

            spyBlock1Destructed.called.should.be.true;
            spyBlock2Inited.called.should.be.true;

            DOM.destruct(rootNode);
            delete DOM.blocks['block1'];
            delete DOM.blocks['block2'];
        });
    });

    describe('emit', function() {
        it('should emit context event with target', function() {
            DOM.decl('block', {
                onSetMod : {
                    'js' : {
                        'inited' : function() {
                            this.emit('event');
                        }
                    }
                }
            });

            var rootNode = $('<div/>'),
                spy = sinon.spy();

            DOM.blocks['block'].on(rootNode, 'event', spy);
            DOM.update(rootNode, BEMHTML.apply({ block : 'block', js : true }));

            var block = rootNode.find('.block').bem('block');

            spy.should.have.been.calledOnce;
            spy.args[0][0].target.should.be.equal(block);

            delete DOM.blocks['block'];
        });
    });
});

provide();

});
