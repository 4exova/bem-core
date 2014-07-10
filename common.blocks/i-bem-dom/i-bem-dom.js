/**
 * @module i-bem-dom
 */

modules.define(
    'i-bem-dom',
    [
        'i-bem',
        'i-bem__internal',
        'inherit',
        'identify',
        'objects',
        'functions',
        'jquery',
        'dom'
    ],
    function(
        provide,
        BEM,
        BEMINTERNAL,
        inherit,
        identify,
        objects,
        functions,
        $,
        dom) {

var undef,
    win = $(window),
    doc = $(document),

    /**
     * Storage for DOM elements by unique key
     * @type Object
     */
    uniqIdToDomElems = {},

    /**
     * Storage for blocks by unique key
     * @type Object
     */
    uniqIdToEntity = {},

    /**
    * Storage for DOM element's parent nodes
    * @type Object
    */
    domNodesToParents = {},

    /**
     * Storage for block parameters
     * @type Object
     */
    domElemToParams = {},

    /**
     * Storage for liveCtx event handlers
     * @type Object
     */
    liveEventCtxStorage = {},

    /**
     * Storage for liveClass event handlers
     * @type Object
     */
    liveClassEventStorage = {},

    entities = BEM.entities,

    BEM_CLASS = 'i-bem',
    BEM_SELECTOR = '.' + BEM_CLASS,
    BEM_PARAMS_ATTR = 'data-bem',

    NAME_PATTERN = BEMINTERNAL.NAME_PATTERN,

    MOD_DELIM = BEMINTERNAL.MOD_DELIM,
    ELEM_DELIM = BEMINTERNAL.ELEM_DELIM,

    EXTRACT_MODS_RE = RegExp(
        '[^' + MOD_DELIM + ']' + MOD_DELIM + '(' + NAME_PATTERN + ')' +
        '(?:' + MOD_DELIM + '(' + NAME_PATTERN + '))?$'),

    buildModPostfix = BEMINTERNAL.buildModPostfix,
    buildClass = BEMINTERNAL.buildClass,

    reverse = Array.prototype.reverse;

/**
 * Initializes entities on a DOM element
 * @param {jQuery} domElem DOM element
 * @param {String} uniqInitId ID of the "initialization wave"
 */
function initEntities(domElem, uniqInitId) {
    var domNode = domElem[0],
        params = getParams(domNode),
        entityName;

    for(entityName in params)
        initEntity(
            entityName,
            domElem,
            processParams(params[entityName], entityName, uniqInitId));
}

/**
 * Initializes a specific entity on a DOM element, or returns the existing entity if it was already created
 * @param {String} entityName Entity name
 * @param {jQuery} domElem DOM element
 * @param {Object} [params] Initialization parameters
 * @param {Boolean} [forceLive=false] Force live initialization
 * @param {Function} [callback] Handler to call after complete initialization
 */
function initEntity(entityName, domElem, params, forceLive, callback) {
    var domNode = domElem[0];

    params || (params = processParams(getEntityParams(domNode, entityName), entityName));

    var uniqId = params.uniqId,
        entity = uniqIdToEntity[uniqId];

    if(entity) {
        if(entity.domElem.index(domNode) < 0) {
            entity.domElem = entity.domElem.add(domElem);
            objects.extend(entity.params, params);
        }

        return entity;
    }

    uniqIdToDomElems[uniqId] = uniqIdToDomElems[uniqId]?
        uniqIdToDomElems[uniqId].add(domElem) :
        domElem;

    var parentDomNode = domNode.parentNode;
    if(!parentDomNode || parentDomNode.nodeType === 11) { // jquery doesn't unique disconnected node
        $.unique(uniqIdToDomElems[uniqId]);
    }

    var entityCls = getEntityCls(entityName);
    if(!(entityCls._liveInitable = !!entityCls._processLive()) || forceLive || params.live === false) {
        forceLive && domElem.addClass(BEM_CLASS); // add css class for preventing memory leaks in further destructing

        entity = new entityCls(uniqIdToDomElems[uniqId], params, !!forceLive);
        delete uniqIdToDomElems[uniqId];
        callback && callback.apply(entity, Array.prototype.slice.call(arguments, 4));
        return entity;
    }
}

function getEntityCls(entityName) {
    if(entities[entityName]) return entities[entityName];

    var splitted = entityName.split(ELEM_DELIM);
    return splitted[1]?
        BEMDOM.declElem(splitted[0], splitted[1], {}, { live : true }, true) :
        BEMDOM.declBlock(entityName, {}, { live : true }, true);
}

/**
 * Processes and adds necessary entity parameters
 * @param {Object} params Initialization parameters
 * @param {String} entityName Entity name
 * @param {String} [uniqInitId] ID of the "initialization wave"
 */
function processParams(params, entityName, uniqInitId) {
    params.uniqId ||
        (params.uniqId = (params.id?
            entityName + '-id-' + params.id :
            identify()) + (uniqInitId || identify()));

    return params;
}

/**
 * Helper for searching for a DOM element using a selector inside the context, including the context itself
 * @param {jQuery} ctx Context
 * @param {String} selector CSS selector
 * @param {Boolean} [excludeSelf=false] Exclude context from search
 * @returns {jQuery}
 */
function findDomElem(ctx, selector, excludeSelf) {
    var res = ctx.find(selector);
    return excludeSelf?
       res :
       res.add(ctx.filter(selector));
}

/**
 * Returns parameters of a entity's DOM element
 * @param {HTMLElement} domNode DOM node
 * @returns {Object}
 */
function getParams(domNode) {
    var uniqId = identify(domNode);
    return domElemToParams[uniqId] ||
        (domElemToParams[uniqId] = extractParams(domNode));
}

/**
 * Returns parameters of a entity extracted from DOM node
 * @param {HTMLElement} domNode DOM node
 * @param {String} blockName
 * @returns {Object}
 */

function getEntityParams(domNode, blockName) {
    var params = getParams(domNode);
    return params[blockName] || (params[blockName] = {});
}

/**
 * Retrieves entity parameters from a DOM element
 * @param {HTMLElement} domNode DOM node
 * @returns {Object}
 */
function extractParams(domNode) {
    var attrVal = domNode.getAttribute(BEM_PARAMS_ATTR);
    return attrVal? JSON.parse(attrVal) : {};
}

/**
 * Uncouple DOM node from the entity. If this is the last node, then destroys the entity.
 * @param {BemDomEntity} entity entity
 * @param {HTMLElement} domNode DOM node
 */
function removeDomNodeFromEntity(entity, domNode) {
    if(entity.domElem.length === 1) {
        entity._destruct();
        delete uniqIdToEntity[entity._uniqId];
    } else {
        entity.domElem = entity.domElem.not(domNode);
    }
}

/**
 * Stores DOM node's parent nodes to the storage
 * @param {jQuery} domElem
 */
function storeDomNodeParents(domElem) {
    domElem.each(function() {
        domNodesToParents[identify(this)] = this.parentNode;
    });
}

/**
 * @class BemDomEntity
 * @description Base mix for BEM entities that have DOM representation
 */
var BemDomEntity = inherit(/** @lends BemDomEntity.prototype */{
    /**
     * @constructor
     * @private
     * @param {jQuery} domElem DOM element that the entity is created on
     * @param {Object} params parameters
     * @param {Boolean} [initImmediately=true]
     */
    __constructor : function(domElem, params, initImmediately) {
        /**
         * DOM elements of entity
         * @member {jQuery}
         * @readonly
         */
        this.domElem = domElem;

        /**
         * Cache for elements
         * @member {Object}
         * @private
         */
        this._elemCache = {};

        /**
         * @member {String} Unique entity ID
         * @private
         */
        this._uniqId = params.uniqId;

        uniqIdToEntity[this._uniqId] = this;

        /**
         * @member {Boolean} Flag for whether it's necessary to unbind from the document and window when destroying the entity
         * @private
         */
        this._needSpecialUnbind = false;

        this.__base(null, params, initImmediately);
    },

    /**
     * @abstract
     * @returns {Block}
     */
    block : function() {},

    /**
     * Finds blocks inside the current entity
     * @param {Function|Object} Block Block or description (block, modName, modVal) of the block to find
     * @returns {Block[]}
     */
    findBlocksInside : function(Block) {
        return this._findEntities('find', Block);
    },

    /**
     * Finds the first block inside the current entity
     * @param {Function|Object} Block Block or description (block, modName, modVal) of the block to find
     * @returns {Block}
     */
    findBlockInside : function(Block) {
        return this._findEntities('find', Block, true);
    },

    /**
     * Finds blocks outside the current entity
     * @param {Function|Object} Block Block or description (block, modName, modVal) of the block to find
     * @returns {Block[]}
     */
    findBlocksOutside : function(Block) {
        return this._findEntities('parents', Block);
    },

    /**
     * Finds the first block outside the current entity
     * @param {Function|Object} Block Block or description (block, modName, modVal) of the block to find
     * @returns {Block}
     */
    findBlockOutside : function(Block) {
        return this._findEntities('closest', Block)[0] || null;
    },

    /**
     * Finds blocks on DOM elements of the current entity
     * @param {Function|Object} Block Block or description (block, modName, modVal) of the block to find
     * @returns {Block[]}
     */
    findBlocksOn : function(Block) {
        return this._findEntities('', Block);
    },

    /**
     * Finds the first block on DOM elements of the current entity
     * @param {Function|Object} Block Block or description (block, modName, modVal) of the block to find
     * @returns {Block}
     */
    findBlockOn : function(Block) {
        return this._findEntities('', Block, true);
    },

    /**
     * Finds elements nested in current entity
     * @param {Function|String|Object} elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {Elem[]}
     */
    findElemsInside : function(elem, strictMode) {
        var res = this._findEntities('find', elem);
        return strictMode? this._filterFindElemResults(res) : res;
    },

    /**
     * Finds the first element nested in current entity
     * @param {Function|String|Object} elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {Elem}
     */
    findElemInside : function(elem, strictMode) {
        return strictMode?
            this._filterFindElemResults(this._findEntities('find', elem))[0] :
            this._findEntities('find', elem, true);
    },

    /**
     * Finds elements outside of current entity
     * @param {Function|String|Object} elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {Elem[]}
     */
    findElemsOutside : function(elem, strictMode) {
        var res = this._findEntities('parents', elem);
        return strictMode? this._filterFindElemResults(res) : res;
    },

    /**
     * Finds the first element outside of current entity
     * @param {Function|String|Object} elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {Elem}
     */
    findElemOutside : function(elem, strictMode) {
        return strictMode?
            this._filterFindElemResults(this._findEntities('parents', elem))[0] :
            this._findEntities('closest', elem, true);
    },

    /**
     * Finds elements on DOM elements of current entity
     * @param {Function|String|Object} elem Element class or name or description elem, modName, modVal
     * @returns {Elem[]}
     */
    findElemsOn : function(elem) {
        return this._findEntities('', elem);
    },

    /**
     * Finds the first element on DOM elements of the current entity
     * @param {Function|String|Object} elem Element class or name or description elem, modName, modVal
     * @returns {Elem}
     */
    findElemOn : function(elem) {
        return this._findEntities('', elem, true);
    },

    /**
     * Filters results of findElem helper execution in strict mode
     * @param {jQuery} res DOM elements
     * @returns {jQuery} DOM elements
     */
    _filterFindElemResults : function(res) {
        var block = this.block();
        return res.filter(function(elem) {
            return elem.block() === block;
        });
    },

    /**
     * Finds entities
     * @param {String} select
     * @param {Function|String|Object} entity
     * @param {Boolean} onlyFirst
     * @returns {*}
     */
    _findEntities : function(select, entity, onlyFirst) {
        var entityName = functions.isFunction(entity)?
                entity.getEntityName() :
                typeof entity === 'object'?
                    entity.block?
                        entity.block.getEntityName() :
                        typeof entity.elem === 'string'?
                            this.__self._blockName + ELEM_DELIM + entity.elem :
                            entity.elem.getEntityName() :
                    this.__self._blockName + ELEM_DELIM + entity.elem,
            selector = '.' +
                (typeof entity === 'object'?
                    buildClass(entityName, entity.modName, entity.modVal) :
                    buildClass(entityName)) +
                (onlyFirst? ':first' : ''),
            domElems = this.domElem.filter(selector);

        select && (domElems = domElems.add(this.domElem[select](selector)));

        if(onlyFirst) return domElems[0]?
            initEntity(entityName, domElems.eq(0), undef, true) :
            null;

        var res = [],
            uniqIds = {};

        domElems.each(function(i, domElem) {
            var block = initEntity(entityName, $(domElem), undef, true);
            if(!uniqIds[block._uniqId]) {
                uniqIds[block._uniqId] = true;
                res.push(block);
            }
        });

        return res;
    },

    /**
     * Adds an event handler for any DOM element
     * @protected
     * @param {jQuery} domElem DOM element where the event will be listened for
     * @param {String|Object} event Event name or event object
     * @param {Object} [data] Additional event data
     * @param {Function} fn Handler function, which will be executed in the entity's context
     * @returns {BemDomEntity} this
     */
    bindToDomElem : function(domElem, event, data, fn) {
        if(functions.isFunction(data)) {
            fn = data;
            data = undef;
        }

        fn?
            domElem.bind(
                this._buildDomEventName(event),
                data,
                $.proxy(fn, this)) :
            objects.each(event, function(fn, event) {
                this.bindToDomElem(domElem, event, data, fn);
            }, this);

        return this;
    },

    /**
     * Adds an event handler to the document
     * @protected
     * @param {String|Object} event Event name or event object
     * @param {Object} [data] Additional event data
     * @param {Function} fn Handler function, which will be executed in the entity's context
     * @returns {BemDomEntity} this
     */
    bindToDoc : function(event, data, fn) {
        this._needSpecialUnbind = true;
        return this.bindToDomElem(doc, event, data, fn);
    },

    /**
     * Adds an event handler to the window
     * @protected
     * @param {String|Object} event Event name or event object
     * @param {Object} [data] Additional event data
     * @param {Function} fn Handler function, which will be executed in the entity's context
     * @returns {BemDomEntity} this
     */
    bindToWin : function(event, data, fn) {
        this._needSpecialUnbind = true;
        return this.bindToDomElem(win, event, data, fn);
    },

    /**
     * Adds an event handler to the main DOM elements of entity
     * @protected
     * @param {String|Object} event Event name or event object
     * @param {Object} [data] Additional event data
     * @param {Function} fn Handler function, which will be executed in the entity's context
     * @returns {BemDomEntity} this
     */
    bindTo : function(event, data, fn) {
        if(functions.isFunction(data)) {
            fn = data;
            data = undef;
        }

        return this.bindToDomElem(this.domElem, event, data, fn);
    },

    /**
    * Removes event handlers from any DOM element
    * @protected
    * @param {jQuery} domElem DOM element where the event was being listened for
    * @param {String|Object} event Event name or event object
    * @param {Function} [fn] Handler function
    * @returns {BemDomEntity} this
    */
    unbindFromDomElem : function(domElem, event, fn) {
        if(typeof event === 'string') {
            event = this._buildDomEventName(event);
            fn?
                domElem.unbind(event, fn) :
                domElem.unbind(event);
        } else {
            objects.each(event, function(fn, event) {
                this.unbindFromDomElem(domElem, event, fn);
            }, this);
        }

        return this;
    },

    /**
    * Removes event handler from document
    * @protected
    * @param {String|Object} event Event name or event object
    * @param {Function} [fn] Handler function
    * @returns {BemDomEntity} this
    */
    unbindFromDoc : function(event, fn) {
        return this.unbindFromDomElem(doc, event, fn);
    },

    /**
    * Removes event handler from window
    * @protected
    * @param {String|Object} event Event name or event object
    * @param {Function} [fn] Handler function
    * @returns {BemDomEntity} this
    */
    unbindFromWin : function(event, fn) {
        return this.unbindFromDomElem(win, event, fn);
    },

    /**
    * Removes event handlers from the main DOM elements of entity
    * @protected
    * @param {String|Object} [event] Event name or event object
    * @param {Function} [fn] Handler function
    * @returns {BemDomEntity} this
    */
    unbindFrom : function(event, fn) {
        return this.unbindFromDomElem(this.domElem, event, fn);
    },

    /**
     * Builds a full name for an event
     * @private
     * @param {String} event Event name
     * @returns {String}
     */
    _buildDomEventName : function(event) {
        var uniq = '.' + this._uniqId;
        return event.indexOf(' ') > 1?
            event.split(' ').map(function(e) {
                return e + uniq;
            }, this).join(' ') :
            event + uniq;
    },

    _ctxEmit : function(e, data) {
        this.__base.apply(this, arguments);

        var _this = this,
            storage = liveEventCtxStorage[_this.__self._buildCtxEventName(e.type)],
            ctxIds = {};

        storage && _this.domElem.each(function(_, ctx) {
            var counter = storage.counter;
            while(ctx && counter) {
                var ctxId = identify(ctx, true);
                if(ctxId) {
                    if(ctxIds[ctxId]) break;
                    var storageCtx = storage.ctxs[ctxId];
                    if(storageCtx) {
                        objects.each(storageCtx, function(handler) {
                            handler.fn.call(
                                handler.ctx || _this,
                                e,
                                data);
                        });
                        counter--;
                    }
                    ctxIds[ctxId] = true;
                }
                ctx = ctx.parentNode || domNodesToParents[ctxId];
            }
        });
    },

    /**
     * Retrieves modifier value from the DOM node's CSS class
     * @private
     * @param {String} modName Modifier name
     * @param {jQuery} [elem] Nested element
     * @param {String} [elemName] Name of the nested element
     * @returns {String} Modifier value
     */
    _extractModVal : function(modName) {
        var domNode = this.domElem[0],
            matches;

        domNode &&
            (matches = domNode.className
                .match(this.__self._buildModValRE(modName)));

        return matches? matches[2] || true : '';
    },

    /**
     * @override
     */
    _onSetMod : function(modName, modVal, oldModVal) {
        this.__base.apply(this, arguments);

        if(modName !== 'js' || modVal !== '') {
            var _self = this.__self,
                classPrefix = _self._buildModClassPrefix(modName),
                classRE = _self._buildModValRE(modName),
                needDel = modVal === '';

            this.domElem.each(function() {
                var className = this.className,
                    modClassName = classPrefix;

                modVal !== true && (modClassName += MOD_DELIM + modVal);

                (oldModVal === true?
                    classRE.test(className) :
                    className.indexOf(classPrefix + MOD_DELIM) > -1)?
                        this.className = className.replace(
                            classRE,
                            (needDel? '' : '$1' + modClassName)) :
                        needDel || $(this).addClass(modClassName);
            });
        }
    },

    /**
     * Lazy search for elements nested in a block (caches results)
     * @private
     * @param {Function|String|Object} elem Element class or name or description elem, modName, modVal
     * @returns {jQuery} DOM elements
     */
    elem : function(elem) {
        if(typeof elem === 'string') {
            elem = { elem : elem };
        } else if(functions.isFunction(elem)) {
            elem = { elem : elem.getName() };
        }

        var key = elem.elem + buildModPostfix(elem.modName, elem.modVal);

        return this._elemCache[key] || (this._elemCache[key] = this.findElemsInside(elem));
    },

    /**
     * Clearing the cache for elements
     * @protected
     * @param {String} [names] Nested element name (or names separated by spaces)
     * @param {String} [modName] Modifier name
     * @param {String} [modVal] Modifier value
     * @returns {Block} this
     */
    dropElemCache : function(names, modName, modVal) {
        if(names) {
            var modPostfix = buildModPostfix(modName, modVal);
            names.indexOf(' ') < 0?
                delete this._elemCache[names + modPostfix] :
                names.split(' ').forEach(function(name) {
                    delete this._elemCache[name + modPostfix];
                }, this);
        } else {
            this._elemCache = {};
        }

        return this;
    },

    /**
     * Retrieves parameters of a block element
     * @param {String|jQuery} elem Element
     * @returns {Object} Parameters
     */
    elemParams : function(elem) {
        var elemName;
        if(typeof elem === 'string') {
            elemName = elem;
            elem = this.elem(elem);
        } else {
            elemName = this.__self._extractElemNameFrom(elem);
        }

        return extractParams(elem[0])[this.__self.buildClass(elemName)] || {};
    },

    /**
     * Elemify given element
     * @param {jQuery} elem Element
     * @param {String} elemName Name
     * @returns {jQuery}
     */
    elemify : function(elem, elemName) {
        (elem = $(elem)).__bemElemName = elemName;
        return elem;
    },

    /**
     * Checks whether a DOM element is in a block
     * @protected
     * @param {jQuery} [ctx=this.domElem] Element where check is being performed
     * @param {jQuery} domElem DOM element
     * @returns {Boolean}
     */
    containsDomElem : function(ctx, domElem) {
        if(arguments.length === 1) {
            domElem = ctx;
            ctx = this.domElem;
        }

        return dom.contains(ctx, domElem);
    },

    /**
     * Builds a CSS selector corresponding to a block/element and modifier
     * @param {String} [elem] Element name
     * @param {String} [modName] Modifier name
     * @param {String} [modVal] Modifier value
     * @returns {String}
     */
    buildSelector : function(elem, modName, modVal) {
        return this.__self.buildSelector(elem, modName, modVal);
    },

    /**
     * Destructs a block
     * @private
     */
    _destruct : function() {
        if(this._needSpecialUnbind) {
            var eventNs = '.' + this._uniqId;
            doc.off(eventNs);
            win.off(eventNs);
        }

        this.__base();

        this.un();
    }

}, /** @lends Block */{
    /**
     * @override
     */
    create : function() {
        throw Error('BEMDOM blocks can not be created otherwise than from DOM');
    },

    /**
     * Processes a block's live properties
     * @private
     * @param {Boolean} [heedLive=false] Whether to take into account that the block already processed its live properties
     * @returns {Boolean} Whether the block is a live block
     */
    _processLive : function(heedLive) {
        var res = this._liveInitable;

        if('live' in this) {
            var noLive = typeof res === 'undefined';

            if(noLive ^ heedLive) {
                res = this.live() !== false;
                this.live = functions.noop;
            }
        }

        return res;
    },

    /**
     * Builds a full name for a live event
     * @private
     * @param {String} e Event name
     * @returns {String}
     */
    _buildCtxEventName : function(e) {
        return this._name + ':' + e;
    },

    _liveClassBind : function(className, e, callback, invokeOnInit) {
        if(e.indexOf(' ') > -1) {
            e.split(' ').forEach(function(e) {
                this._liveClassBind(className, e, callback, invokeOnInit);
            }, this);
        } else {
            var storage = liveClassEventStorage[e],
                uniqId = identify(callback);

            if(!storage) {
                storage = liveClassEventStorage[e] = {};
                BEMDOM.scope.on(e, $.proxy(this._liveClassTrigger, this));
            }

            storage = storage[className] || (storage[className] = { uniqIds : {}, fns : [] });

            if(!(uniqId in storage.uniqIds)) {
                storage.fns.push({ uniqId : uniqId, fn : this._buildLiveEventFn(callback, invokeOnInit) });
                storage.uniqIds[uniqId] = storage.fns.length - 1;
            }
        }

        return this;
    },

    _liveClassUnbind : function(className, e, callback) {
        var storage = liveClassEventStorage[e];
        if(storage) {
            if(callback) {
                if(storage = storage[className]) {
                    var uniqId = identify(callback);
                    if(uniqId in storage.uniqIds) {
                        var i = storage.uniqIds[uniqId],
                            len = storage.fns.length - 1;
                        storage.fns.splice(i, 1);
                        while(i < len) storage.uniqIds[storage.fns[i++].uniqId] = i - 1;
                        delete storage.uniqIds[uniqId];
                    }
                }
            } else {
                delete storage[className];
            }
        }

        return this;
    },

    _liveClassTrigger : function(e) {
        var storage = liveClassEventStorage[e.type];
        if(storage) {
            var node = e.target, classNames = [];
            for(var className in storage) {
                classNames.push(className);
            }
            do {
                var nodeClassName = ' ' + node.className + ' ', i = 0;
                while(className = classNames[i++]) {
                    if(nodeClassName.indexOf(' ' + className + ' ') > -1) {
                        var j = 0, fns = storage[className].fns, fn, stopPropagationAndPreventDefault = false;
                        while(fn = fns[j++])
                            if(fn.fn.call($(node), e) === false) stopPropagationAndPreventDefault = true;

                        stopPropagationAndPreventDefault && e.preventDefault();
                        if(stopPropagationAndPreventDefault || e.isPropagationStopped()) return;

                        classNames.splice(--i, 1);
                    }
                }
            } while(classNames.length && (node = node.parentNode));
        }
    },

    _buildLiveEventFn : function(callback, invokeOnInit) {
        var _this = this;
        return function(e) {
            e.currentTarget = this;
            var args = [
                    _this._name,
                    $(this).closest(_this.buildSelector()),
                    undef,
                    true
                ],
                block = initEntity.apply(null, invokeOnInit? args.concat([callback, e]) : args);

            if(block && !invokeOnInit && callback)
                return callback.apply(block, arguments);
        };
    },

    /**
     * Helper for live initialization for an event on DOM elements of a block or its elements
     * @protected
     * @param {String} [elemName] Element name or names (separated by spaces)
     * @param {String} event Event name
     * @param {Function} [callback] Handler to call after successful initialization
     */
    liveInitOnEvent : function(elemName, event, callback) {
        return this.liveBindTo(elemName, event, callback, true);
    },

    /**
     * Helper for subscribing to live events on DOM elements of a block or its elements
     * @protected
     * @param {String|Object} [to] Description (object with modName, modVal, elem) or name of the element or elements (space-separated)
     * @param {String} event Event name
     * @param {Function} [callback] Handler
     * @returns {Function} this
     */
    liveBindTo : function(to, event, callback, invokeOnInit) {
        if(!event || functions.isFunction(event)) {
            callback = event;
            event = to;
            to = undef;
        }

        if(!to || typeof to === 'string') {
            to = { elem : to };
        }

        if(to.elem && to.elem.indexOf(' ') > 0) {
            to.elem.split(' ').forEach(function(elem) {
                this._liveClassBind(
                    this.buildClass(elem, to.modName, to.modVal),
                    event,
                    callback,
                    invokeOnInit);
            }, this);
            return this;
        }

        return this._liveClassBind(
            this.buildClass(to.elem, to.modName, to.modVal),
            event,
            callback,
            invokeOnInit);
    },

    /**
     * Helper for unsubscribing from live events on DOM elements of a block or its elements
     * @protected
     * @param {String} [elem] Name of the element or elements (space-separated)
     * @param {String} event Event name
     * @param {Function} [callback] Handler
     * @returns {Function} this
     */
    liveUnbindFrom : function(elem, event, callback) {
        if(elem.indexOf(' ') > 1) {
            elem.split(' ').forEach(function(elem) {
                this._liveClassUnbind(
                    this.buildClass(elem),
                    event,
                    callback);
            }, this);
            return this;
        }

        return this._liveClassUnbind(
            this.buildClass(elem),
            event,
            callback);
    },

    /**
     * Helper for live initialization when a different block is initialized
     * @private
     * @param {String} event Event name
     * @param {Function} Block Block that should emit a reaction when initialized
     * @param {Function} callback Handler to be called after successful initialization in the new block's context
     * @param {String} findFnName Name of the method for searching
     */
    _liveInitOnBlockEvent : function(event, Block, callback, findFnName) {
        Block.on(
            event,
            function(e) {
                var args = arguments,
                    blocks = e.target[findFnName](this);

                callback && blocks.forEach(function(block) {
                    callback.apply(block, args);
                });
            },
            this);

        return this;
    },

    /**
     * Helper for live initialization for a different block's event on the current block's DOM element
     * @protected
     * @param {String} event Event name
     * @param {Function} Block Block that should emit a reaction when initialized
     * @param {Function} callback Handler to be called after successful initialization in the new block's context
     * @returns {Function} this
     */
    liveInitOnBlockEvent : function(event, Block, callback) {
        return this._liveInitOnBlockEvent(event, Block, callback, 'findBlocksOn');
    },

    /**
     * Helper for live initialization for a different block's event inside the current block
     * @protected
     * @param {String} event Event name
     * @param {Function} Block Block that should emit a reaction when initialized
     * @param {Function} [callback] Handler to be called after successful initialization in the new block's context
     * @returns {Function} this
     */
    liveInitOnBlockInsideEvent : function(event, Block, callback) {
        return this._liveInitOnBlockEvent(event, Block, callback, 'findBlocksOutside');
    },

    /**
     * Adds a live event handler to a block, based on a specified element where the event will be listened for
     * @param {jQuery} [ctx] The element in which the event will be listened for
     * @param {String} e Event name
     * @param {Object} [data] Additional information that the handler gets as e.data
     * @param {Function} fn Handler
     * @param {Object} [fnCtx] Handler's context
     * @returns {Function} this
     */
    on : function(ctx, e, data, fn, fnCtx) {
        return typeof ctx === 'object' && ctx.jquery?
            this._liveCtxBind(ctx, e, data, fn, fnCtx) :
            this.__base(ctx, e, data, fn);
    },

    /**
     * Removes the live event handler from a block, based on a specified element where the event was being listened for
     * @param {jQuery} [ctx] The element in which the event was being listened for
     * @param {String} e Event name
     * @param {Function} [fn] Handler
     * @param {Object} [fnCtx] Handler context
     * @returns {Function} this
     */
    un : function(ctx, e, fn, fnCtx) {
        return typeof ctx === 'object' && ctx.jquery?
            this._liveCtxUnbind(ctx, e, fn, fnCtx) :
            this.__base(ctx, e, fn);
    },

    /**
     * Adds a live event handler to a block, based on a specified element where the event will be listened for
     * @private
     * @param {jQuery} ctx The element in which the event will be listened for
     * @param {String} e  Event name
     * @param {Object} [data] Additional information that the handler gets as e.data
     * @param {Function} fn Handler
     * @param {Object} [fnCtx] Handler context
     * @returns {Function} this
     */
    _liveCtxBind : function(ctx, e, data, fn, fnCtx) {
        if(typeof e === 'object') {
            if(functions.isFunction(data) || functions.isFunction(fn)) { // mod change event
                e = this._buildModEventName(e);
            } else {
                objects.each(e, function(fn, e) {
                    this._liveCtxBind(ctx, e, fn, data);
                }, this);
                return this;
            }
        }

        if(functions.isFunction(data)) {
            fnCtx = fn;
            fn = data;
            data = undef;
        }

        if(e.indexOf(' ') > -1) {
            e.split(' ').forEach(function(e) {
                this._liveCtxBind(ctx, e, data, fn, fnCtx);
            }, this);
        } else {
            var ctxE = this._buildCtxEventName(e),
                storage = liveEventCtxStorage[ctxE] ||
                    (liveEventCtxStorage[ctxE] = { counter : 0, ctxs : {} });

            ctx.each(function() {
                var ctxId = identify(this),
                    ctxStorage = storage.ctxs[ctxId];
                if(!ctxStorage) {
                    ctxStorage = storage.ctxs[ctxId] = {};
                    ++storage.counter;
                }
                ctxStorage[identify(fn) + (fnCtx? identify(fnCtx) : '')] = {
                    fn : fn,
                    data : data,
                    ctx : fnCtx
                };
            });
        }

        return this;
    },

    /**
     * Removes a live event handler from a block, based on a specified element where the event was being listened for
     * @private
     * @param {jQuery} ctx The element in which the event was being listened for
     * @param {String|Object} e Event name
     * @param {Function} [fn] Handler
     * @param {Object} [fnCtx] Handler context
     * @returns {Function} this
     */
    _liveCtxUnbind : function(ctx, e, fn, fnCtx) {
        if(typeof e === 'object' && functions.isFunction(fn)) { // mod change event
            e = this._buildModEventName(e);
        }

        var storage = liveEventCtxStorage[e = this._buildCtxEventName(e)];

        if(storage) {
            ctx.each(function() {
                var ctxId = identify(this, true),
                    ctxStorage;
                if(ctxId && (ctxStorage = storage.ctxs[ctxId])) {
                    fn && delete ctxStorage[identify(fn) + (fnCtx? identify(fnCtx) : '')];
                    if(!fn || objects.isEmpty(ctxStorage)) {
                        storage.counter--;
                        delete storage.ctxs[ctxId];
                    }
                }
            });
            storage.counter || delete liveEventCtxStorage[e];
        }

        return this;
    },

    /**
     * Retrieves the name of an element nested in a block
     * @private
     * @param {jQuery} elem Nested element
     * @returns {String|undef}
     */
    _extractElemNameFrom : function(elem) {
        if(elem.__bemElemName) return elem.__bemElemName;

        var matches = elem[0].className.match(this._buildElemNameRE());
        return matches? matches[1] : undef;
    },

    /**
     * Builds a prefix for the CSS class of a DOM element of the entity, based on modifier name
     * @private
     * @param {String} modName Modifier name
     * @returns {String}
     */
    _buildModClassPrefix : function(modName) {
        return this.getEntityName() + MOD_DELIM + modName;
    },

    /**
     * Builds a regular expression for extracting modifier values from a DOM element of a entity
     * @private
     * @param {String} modName Modifier name
     * @returns {RegExp}
     */
    _buildModValRE : function(modName) {
        return new RegExp(
            '(\\s|^)' +
            this._buildModClassPrefix(modName) +
            '(?:' + MOD_DELIM + '(' + NAME_PATTERN + '))?(?=\\s|$)');
    },

    /**
     * Builds a regular expression for extracting names of elements nested in a block
     * @private
     * @returns {RegExp}
     */
    _buildElemNameRE : function() {
        return new RegExp(this._name + ELEM_DELIM + '(' + NAME_PATTERN + ')(?:\\s|$)');
    },

    /**
     * Builds a CSS class corresponding to the block/element and modifier
     * @param {String} [elem] Element name
     * @param {String} [modName] Modifier name
     * @param {String} [modVal] Modifier value
     * @returns {String}
     */
    buildClass : function(elem, modName, modVal) {
        return buildClass(this._name, elem, modName, modVal);
    },

    /**
     * Builds a CSS selector corresponding to the block/element and modifier
     * @param {String} [elem] Element name
     * @param {String} [modName] Modifier name
     * @param {String} [modVal] Modifier value
     * @returns {String}
     */
    buildSelector : function(elem, modName, modVal) {
        return '.' + this.buildClass(elem, modName, modVal);
    }
});

/**
 * @class Block
 * @description Base class for creating BEM blocks that have DOM representation
 * @augments i-bem:Block
 * @exports
 */
var Block = inherit([BEM.Block, BemDomEntity], /** @lends Block.prototype */{
    /**
     * @override
     */
    block : function() {
        return this;
    }
}, /** @lends Block */{
});

/**
 * @class Elem
 * @description Base class for creating BEM elements that have DOM representation
 * @augments i-bem:Elem
 * @exports
 */
var Elem = inherit([BEM.Elem, BemDomEntity], /** @lends Elem.prototype */{
    /**
     * @override
     */
    block : function() {
        return this._block || (this._block = this.findBlockOutside(getEntityCls(this.__self._blockName)));
    },

    /**
     * @override
     */
    _onSetMod : function(modName, modVal, oldModVal) {
        var name = this.__self.getName();
        this.block()
            .dropElemCache(name, modName, oldModVal)
            .dropElemCache(name, modName, modVal);

        this.__base.apply(this, arguments);
    }
}, /** @lends Elem */{
});

/**
 * Returns a block on a DOM element and initializes it if necessary
 * @param {Function} Block Block
 * @param {Object} params Block parameters
 * @returns {BEMDOM}
 */
$.fn.bem = function(Block, params) {
    return initEntity(Block.getName(), this, params, true);
};

var BEMDOM = /** @exports */{

    /**
     * Scope
     * @type jQuery
     */
    scope : null,

    /**
     * Document shortcut
     * @type jQuery
     */
    doc : doc,

    /**
     * Window shortcut
     * @type jQuery
     */
    win : win,

    /**
     * Base BEMDOM block
     * @type Function
     */
    Block : Block,

    /**
     * Declares DOM-based block and creates a block class
     * @param {String} blockName Block name
     * @param {Function|Array[Function]} [baseBlocks] base block + mixes
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function} Block class
     */
    declBlock : function(blockName, baseBlocks, props, staticProps) {
        if(!baseBlocks || (typeof baseBlocks === 'object' && !Array.isArray(baseBlocks))) {
            staticProps = props;
            props = baseBlocks;
            baseBlocks = Block;
        }

        return BEM.declBlock(blockName, baseBlocks, props, staticProps);
    },

    declMix : BEM.declMix,

    /**
     * Initializes blocks on a fragment of the DOM tree
     * @param {jQuery|String} [ctx=scope] Root DOM node
     * @returns {jQuery} ctx Initialization context
     */
    init : function(ctx) {
        ctx = typeof ctx === 'string'?
            $(ctx) :
            ctx || BEMDOM.scope;

        var uniqInitId = identify();
        findDomElem(ctx, BEM_SELECTOR).each(function() {
            initEntities($(this), uniqInitId);
        });

        BEM._runInitFns();

        return ctx;
    },

    /**
     * Destroys blocks on a fragment of the DOM tree
     * @param {jQuery} ctx Root DOM node
     * @param {Boolean} [excludeSelf=false] Exclude the main domElem
     */
    destruct : function(ctx, excludeSelf) {
        var _ctx;
        if(excludeSelf) {
            storeDomNodeParents(_ctx = ctx.children());
            ctx.empty();
        } else {
            storeDomNodeParents(_ctx = ctx);
            ctx.remove();
        }

        reverse.call(findDomElem(_ctx, BEM_SELECTOR)).each(function(_, domNode) {
            var params = getParams(domNode);
            objects.each(params, function(blockParams) {
                if(blockParams.uniqId) {
                    var block = uniqIdToEntity[blockParams.uniqId];
                    block?
                        removeDomNodeFromEntity(block, domNode) :
                        delete uniqIdToDomElems[blockParams.uniqId];
                }
            });
            delete domElemToParams[identify(domNode)];
        });

        // flush parent nodes storage that has been filled above
        domNodesToParents = {};
    },

    /**
     * Replaces a fragment of the DOM tree inside the context, destroying old blocks and intializing new ones
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content New content
     * @returns {jQuery} Updated root DOM node
     */
    update : function(ctx, content) {
        this.destruct(ctx, true);
        return this.init(ctx.html(content));
    },

    /**
     * Changes a fragment of the DOM tree including the context and initializes blocks.
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    replace : function(ctx, content) {
        var prev = ctx.prev(),
            parent = ctx.parent();

        this.destruct(ctx);

        return this.init(prev.length?
            $(content).insertAfter(prev) :
            $(content).prependTo(parent));
    },

    /**
     * Adds a fragment of the DOM tree at the end of the context and initializes blocks
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    append : function(ctx, content) {
        return this.init($(content).appendTo(ctx));
    },

    /**
     * Adds a fragment of the DOM tree at the beginning of the context and initializes blocks
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    prepend : function(ctx, content) {
        return this.init($(content).prependTo(ctx));
    },

    /**
     * Adds a fragment of the DOM tree before the context and initializes blocks
     * @param {jQuery} ctx Contextual DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    before : function(ctx, content) {
        return this.init($(content).insertBefore(ctx));
    },

    /**
     * Adds a fragment of the DOM tree after the context and initializes blocks
     * @param {jQuery} ctx Contextual DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    after : function(ctx, content) {
        return this.init($(content).insertAfter(ctx));
    }
};

// Set default scope after DOM ready
$(function() {
    BEMDOM.scope = $('body');
});

provide(BEMDOM);

});

(function() {

var origDefine = modules.define;

modules.define = function(name, deps, decl) {
    origDefine.apply(modules, arguments);

    name !== 'i-bem-dom__init' && arguments.length > 2 && ~deps.indexOf('i-bem-dom') &&
        modules.define('i-bem-dom__init', [name], function(provide, _, prev) {
            provide(prev);
        });
};

})();
