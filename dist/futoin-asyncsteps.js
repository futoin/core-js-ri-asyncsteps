(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        this.$as = factory();
    }
}(function () {
    var global = this, define;
    function _require(id) {
        var module = _require.cache[id];
        if (!module) {
            var exports = {};
            module = _require.cache[id] = {
                id: id,
                exports: exports
            };
            _require.modules[id].call(exports, module, exports);
        }
        return module.exports;
    }
    _require.cache = [];
    _require.modules = [
        function (module, exports) {
            'use strict';
            var async_steps = _require(1);
            var parallel_step = _require(6);
            var futoin_errors = _require(5);
            exports = module.exports = function (root, as) {
                return new module.exports.AsyncStepProtector(root, as);
            };
            var AsyncStepProtector = function (root) {
                this._root = root;
                this.state = root.state;
            };
            var ASPProto = {
                    _root: null,
                    _queue: null,
                    _onerror: null,
                    _oncancel: null,
                    _limit_event: null
                };
            ASPProto.add = function (func, onerror) {
                this._sanityCheck();
                this._root._check_func(func);
                this._root._check_onerror(onerror);
                var q = this._queue;
                if (q === null) {
                    q = [];
                    this._queue = q;
                }
                q.push([
                    func,
                    onerror
                ]);
                return this;
            };
            ASPProto.parallel = function (onerror) {
                var p = parallel_step(this._root, this);
                this.add(function (as) {
                    p.executeParallel(as);
                }, onerror);
                return p;
            };
            ASPProto.success = function (arg) {
                this._sanityCheck();
                if (this._queue !== null) {
                    this.error(futoin_errors.InternalError, 'Invalid success() call');
                }
                this._root._handle_success(Array.prototype.slice.call(arguments));
            };
            ASPProto.successStep = function () {
                this._sanityCheck();
                var q = this._queue;
                if (q !== null) {
                    q.push([
                        null,
                        null
                    ]);
                } else {
                    this.success();
                }
            };
            ASPProto.error = function (name, error_info) {
                this._sanityCheck();
                this._root.error(name, error_info);
            };
            ASPProto.setTimeout = function (timeout_ms) {
                this._sanityCheck();
                if (this._limit_event !== null) {
                    async_steps.AsyncTool.cancelCall(this._limit_event);
                }
                var _this = this;
                this._limit_event = async_steps.AsyncTool.callLater(function () {
                    _this._limit_event = null;
                    _this._root._handle_error(futoin_errors.Timeout);
                }, timeout_ms);
                return this;
            };
            ASPProto.setCancel = function (oncancel) {
                this._oncancel = oncancel;
                return this;
            };
            ASPProto.copyFrom = function (other) {
                this._sanityCheck();
                if (other._queue.length) {
                    var q = this._queue;
                    if (q === null) {
                        q = [];
                        this._queue = q;
                    }
                    q.push.apply(q, other._queue);
                }
                var os = other.state;
                var s = this.state;
                for (var k in os) {
                    if (typeof s[k] === 'undefined') {
                        s[k] = os[k];
                    }
                }
                return this;
            };
            ASPProto.loop = function (func, label) {
                this._sanityCheck();
                this.add(function (outer_as) {
                    var model_as = new async_steps.AsyncSteps();
                    var inner_as;
                    var create_iteration = function () {
                        inner_as = new async_steps.AsyncSteps(outer_as.state);
                        inner_as.copyFrom(model_as);
                        inner_as.execute();
                    };
                    model_as.add(function (as) {
                        func(as);
                    }, function (as, err) {
                        var term_label;
                        if (err === futoin_errors.LoopCont) {
                            term_label = as.state._loop_term_label;
                            if (term_label && term_label !== label) {
                                async_steps.AsyncTool.callLater(function () {
                                    try {
                                        outer_as.continue(term_label);
                                    } catch (ex) {
                                    }
                                });
                            } else {
                                as.success();
                                return;
                            }
                        } else if (err === futoin_errors.LoopBreak) {
                            term_label = as.state._loop_term_label;
                            if (term_label && term_label !== label) {
                                async_steps.AsyncTool.callLater(function () {
                                    try {
                                        outer_as.break(term_label);
                                    } catch (ex) {
                                    }
                                });
                            } else {
                                async_steps.AsyncTool.callLater(function () {
                                    outer_as.success();
                                });
                            }
                        } else {
                            async_steps.AsyncTool.callLater(function () {
                                try {
                                    outer_as.error(err);
                                } catch (ex) {
                                }
                            });
                        }
                        model_as.cancel();
                    }).add(function (as) {
                        void as;
                        async_steps.AsyncTool.callLater(create_iteration);
                    });
                    outer_as.setCancel(function (as) {
                        void as;
                        inner_as.cancel();
                        model_as.cancel();
                    });
                    create_iteration();
                });
                return this;
            };
            ASPProto.repeat = function (count, func, label) {
                var i = 0;
                this.loop(function (as) {
                    if (i < count) {
                        func(as, i++);
                    } else {
                        as.break();
                    }
                }, label);
                return this;
            };
            ASPProto.forEach = function (map_or_list, func, label) {
                if (Array.isArray(map_or_list)) {
                    this.repeat(map_or_list.length, function (as, i) {
                        func(as, i, map_or_list[i]);
                    }, label);
                } else {
                    var keys = Object.keys(map_or_list);
                    this.repeat(keys.length, function (as, i) {
                        func(as, keys[i], map_or_list[keys[i]]);
                    }, label);
                }
                return this;
            };
            ASPProto.break = function (label) {
                this._sanityCheck();
                this.state._loop_term_label = label;
                this._root.error(futoin_errors.LoopBreak);
            };
            ASPProto.continue = function (label) {
                this._sanityCheck();
                this.state._loop_term_label = label;
                this._root.error(futoin_errors.LoopCont);
            };
            ASPProto._cleanup = function () {
                this._root = null;
                this._queue = null;
                this._onerror = null;
                this._oncancel = null;
                this.state = null;
            };
            ASPProto._sanityCheck = function () {
                if (this._root === null) {
                    throw Error(futoin_errors.InternalError, 'Unexpected call, object is out of service');
                }
                var stack = this._root._stack;
                if (stack[stack.length - 1] !== this) {
                    this._root.error(futoin_errors.InternalError, 'Invalid call (sanity check)');
                }
            };
            AsyncStepProtector.prototype = ASPProto;
            exports.AsyncStepProtector = AsyncStepProtector;
        },
        function (module, exports) {
            'use strict';
            var async_tool = _require(2);
            var async_tool_test = _require(3);
            var futoin_errors = _require(5);
            exports = module.exports = function () {
                return new module.exports.AsyncSteps();
            };
            var asyncstep_protector = _require(0);
            var parallel_step = _require(6);
            exports.AsyncTool = async_tool;
            exports.FutoInError = futoin_errors;
            exports.installAsyncToolTest = function (install) {
                if (install === false) {
                    exports.AsyncTool = async_tool;
                } else {
                    exports.AsyncTool = async_tool_test;
                }
            };
            function AsyncSteps(state) {
                if (typeof state === 'undefined') {
                    state = function () {
                        return this.state;
                    };
                }
                this.state = state;
                this._queue = [];
                this._stack = [];
                this._in_execute = false;
                var _this = this;
                this._execute_cb = function () {
                    _this.execute();
                };
            }
            var AsyncStepsProto = {
                    _execute_event: null,
                    _next_args: []
                };
            AsyncStepsProto._check_func = function (func) {
                if (func.length < 1) {
                    this.error(futoin_errors.InternalError, 'Step function must expect at least AsyncStep interface');
                }
            };
            AsyncStepsProto._check_onerror = function (onerror) {
                if (onerror && onerror.length !== 2) {
                    this.error(futoin_errors.InternalError, 'Error handler must take exactly two arguments');
                }
            };
            AsyncStepsProto.add = function (func, onerror) {
                this._sanityCheck();
                this._check_func(func);
                this._check_onerror(onerror);
                this._queue.push([
                    func,
                    onerror
                ]);
                return this;
            };
            AsyncStepsProto.parallel = function (onerror) {
                var p = parallel_step(this, this);
                this.add(function (as) {
                    p.executeParallel(as);
                }, onerror);
                return p;
            };
            AsyncStepsProto.error = function (name, error_info) {
                this.state.error_info = error_info;
                if (!this._in_execute) {
                    this._handle_error(name);
                }
                throw new Error(name);
            };
            AsyncStepsProto.copyFrom = function (other) {
                this._queue.push.apply(this._queue, other._queue);
                var os = other.state;
                var s = this.state;
                for (var k in os) {
                    if (typeof s[k] === 'undefined') {
                        s[k] = os[k];
                    }
                }
                return this;
            };
            AsyncStepsProto._handle_success = function (args) {
                var stack = this._stack;
                if (!stack.length) {
                    this.error(futoin_errors.InternalError, 'Invalid success completion');
                }
                this._next_args = args;
                for (var asp = stack[stack.length - 1];;) {
                    if (asp._limit_event) {
                        exports.AsyncTool.cancelCall(asp._limit_event);
                        asp._limit_event = null;
                    }
                    asp._cleanup();
                    stack.pop();
                    if (!stack.length) {
                        break;
                    }
                    asp = stack[stack.length - 1];
                    if (asp._queue.length) {
                        break;
                    }
                }
                if (stack.length || this._queue.length) {
                    this._execute_event = exports.AsyncTool.callLater(this._execute_cb);
                }
            };
            AsyncStepsProto._handle_error = function (name) {
                this._next_args = [];
                var stack = this._stack;
                var asp;
                var slen;
                for (; stack.length; stack.pop()) {
                    asp = stack[stack.length - 1];
                    if (asp._limit_event) {
                        exports.AsyncTool.cancelCall(asp._limit_event);
                        asp._limit_event = null;
                    }
                    if (asp._oncancel) {
                        asp._oncancel.call(null, asp);
                        asp._oncancel = null;
                    }
                    if (asp._onerror) {
                        slen = stack.length;
                        asp._queue = null;
                        try {
                            this._in_execute = true;
                            asp._onerror.call(null, asp, name);
                        } catch (e) {
                            this.state.last_exception = e;
                            name = e.message;
                        } finally {
                            this._in_execute = false;
                        }
                        if (slen !== stack.length) {
                            return;
                        }
                    }
                    asp._cleanup();
                }
                this._queue = [];
                if (this._execute_event) {
                    exports.AsyncTool.cancelCall(this._execute_event);
                    this._execute_event = null;
                }
            };
            AsyncStepsProto.cancel = function () {
                this._next_args = [];
                if (this._execute_event) {
                    exports.AsyncTool.cancelCall(this._execute_event);
                    this._execute_event = null;
                }
                var stack = this._stack;
                var asp;
                while (stack.length) {
                    asp = stack.pop();
                    if (asp._limit_event) {
                        exports.AsyncTool.cancelCall(asp._limit_event);
                        asp._limit_event = null;
                    }
                    if (asp._oncancel) {
                        asp._oncancel.call(null, asp);
                        asp._oncancel = null;
                    }
                    asp._cleanup();
                }
                this._queue = [];
                return this;
            };
            AsyncStepsProto.execute = function () {
                if (this._execute_event) {
                    exports.AsyncTool.cancelCall(this._execute_event);
                    this._execute_event = null;
                }
                var stack = this._stack;
                var q;
                if (stack.length) {
                    q = stack[stack.length - 1]._queue;
                } else {
                    q = this._queue;
                }
                if (!q.length) {
                    return;
                }
                var curr = q.shift();
                if (curr[0] === null) {
                    this._handle_success([]);
                    return;
                }
                var asp = asyncstep_protector(this);
                var next_args = this._next_args;
                this._next_args = [];
                next_args.unshift(asp);
                try {
                    asp._onerror = curr[1];
                    stack.push(asp);
                    var oc = stack.length;
                    this._in_execute = true;
                    curr[0].apply(null, next_args);
                    if (oc === stack.length) {
                        if (asp._queue !== null) {
                            this._execute_event = exports.AsyncTool.callLater(this._execute_cb);
                        } else if (asp._limit_event === null && asp._oncancel === null) {
                            this._handle_success([]);
                        }
                    }
                } catch (e) {
                    this._in_execute = false;
                    this.state.last_exception = e;
                    this._handle_error(e.message);
                } finally {
                    this._in_execute = false;
                }
                return this;
            };
            AsyncStepsProto._sanityCheck = function () {
                if (this._stack.length) {
                    this.error(futoin_errors.InternalError, 'Top level add in execution');
                }
            };
            var ASPProto = asyncstep_protector.AsyncStepProtector.prototype;
            AsyncStepsProto.loop = ASPProto.loop;
            AsyncStepsProto.repeat = ASPProto.repeat;
            AsyncStepsProto.forEach = ASPProto.forEach;
            AsyncSteps.prototype = AsyncStepsProto;
            exports.AsyncSteps = AsyncSteps;
        },
        function (module, exports) {
            'use strict';
            exports = module.exports = {};
            if (typeof setImmediate === 'undefined') {
                exports.callLater = function (func, timeout_ms) {
                    return setTimeout(func, timeout_ms);
                };
                exports.cancelCall = function (func) {
                    return clearTimeout(func);
                };
            } else {
                exports.callLater = function (func, timeout_ms) {
                    if (timeout_ms) {
                        return setTimeout(func, timeout_ms);
                    }
                    return setImmediate(func);
                };
                exports.cancelCall = function (handle) {
                    if (typeof handle._onImmediate !== 'undefined') {
                        clearImmediate(handle);
                    } else {
                        clearTimeout(handle);
                    }
                };
            }
        },
        function (module, exports) {
            'use strict';
            var performance_now = _require(7);
            var q = [];
            exports = module.exports = {};
            exports.callLater = function (func, timeout_ms) {
                var t = performance_now() * 1000;
                if (timeout_ms) {
                    t += timeout_ms;
                }
                var e = {
                        f: func,
                        t: t
                    };
                for (var i = 0; i < q.length; ++i) {
                    if (q[i].t > t) {
                        q.splice(i, 0, e);
                        return;
                    }
                }
                q.push(e);
                return e;
            };
            exports.cancelCall = function (handle) {
                var i = q.indexOf(handle);
                if (i >= 0) {
                    q.splice(i, 1);
                }
            };
            exports.nextEvent = function () {
                var e = q.shift();
                e.f();
            };
            exports.hasEvents = function () {
                return q.length > 0;
            };
            exports.getEvents = function () {
                return q;
            };
            exports.resetEvents = function () {
                q.splice(0, q.length);
            };
            exports.run = function () {
                while (this.hasEvents()) {
                    this.nextEvent();
                }
            };
        },
        function (module, exports) {
            (function (window) {
                'use strict';
                var futoin = window.FutoIn || {};
                if (typeof futoin.AsyncSteps === 'undefined') {
                    var $as = _require(1);
                    window.$as = $as;
                    futoin.$as = $as;
                    window.FutoInError = $as.FutoInError;
                    futoin.AsyncSteps = $as.AsyncSteps;
                    window.FutoIn = futoin;
                    if (module) {
                        module.exports = $as;
                    }
                }
            }(window));
        },
        function (module, exports) {
            'use strict';
            exports = module.exports = {
                ConnectError: 'ConnectError',
                CommError: 'CommError',
                UnknownInterface: 'UnknownInterface',
                NotSupportedVersion: 'NotSupportedVersion',
                NotImplemented: 'NotImplemented',
                Unauthorized: 'Unauthorized',
                InternalError: 'InternalError',
                InvokerError: 'InvokerError',
                InvalidRequest: 'InvalidRequest',
                DefenseRejected: 'DefenseRejected',
                PleaseReauth: 'PleaseReauth',
                SecurityError: 'SecurityError',
                Timeout: 'Timeout',
                LoopBreak: 'LoopBreak',
                LoopCont: 'LoopCont'
            };
        },
        function (module, exports) {
            'use strict';
            var async_steps = _require(1);
            exports = module.exports = function (root, as) {
                return new module.exports.ParallelStep(root, as);
            };
            var ParallelStep = function (root, as) {
                this._root = root;
                this._as = as;
                this._queue = [];
                this._psteps = [];
                this._complete_count = 0;
            };
            var ParallelStepProto = {};
            ParallelStepProto._root = null;
            ParallelStepProto._as = null;
            ParallelStepProto._psteps = null;
            ParallelStepProto._complete_count = null;
            ParallelStepProto._error = null;
            ParallelStepProto.add = function (func, onerror) {
                this._root._check_func(func);
                this._root._check_onerror(onerror);
                this._queue.push([
                    func,
                    onerror
                ]);
                return this;
            };
            ParallelStepProto._complete = function () {
                this._complete_count += 1;
                if (this._complete_count === this._psteps.length) {
                    this._as.success();
                    this._cleanup();
                }
            };
            ParallelStepProto._error = function (name) {
                try {
                    this._as.error(name);
                } catch (e) {
                }
            };
            ParallelStepProto.executeParallel = function (as) {
                var p;
                if (this._root !== as._root) {
                    p = new ParallelStep(as._root, as);
                    p._queue.push.apply(p._queue, this._queue);
                    p.executeParallel(as);
                    return;
                }
                this._as = as;
                var _this = this;
                if (!this._queue.length) {
                    this._complete();
                    return;
                }
                as.setCancel(function () {
                    _this.cancel();
                });
                var q = this._queue;
                var plist = this._psteps;
                var success_func = function (as) {
                    void as;
                    _this._complete();
                };
                var error_func = function (as, err) {
                    _this._error(err);
                };
                var step_func_gen = this._step_func_gen;
                q.forEach(function (p) {
                    var pa = new async_steps.AsyncSteps(as.state);
                    pa.add(step_func_gen(p), error_func);
                    pa.add(success_func);
                    plist.push(pa);
                });
                plist.forEach(function (p) {
                    p.execute();
                });
            };
            ParallelStepProto._step_func_gen = function (pi) {
                return function (as) {
                    as.add(pi[0], pi[1]);
                };
            };
            ParallelStepProto.cancel = function () {
                this._psteps.forEach(function (p) {
                    p.cancel();
                });
                this._cleanup();
            };
            ParallelStepProto._cleanup = function () {
                this._root = null;
                this._as = null;
                this._psteps = null;
            };
            ParallelStep.prototype = ParallelStepProto;
            exports.ParallelStep = ParallelStep;
        },
        function (module, exports) {
            (function () {
                var getNanoSeconds, hrtime, loadTime;
                if (typeof performance !== 'undefined' && performance !== null && performance.now) {
                    module.exports = function () {
                        return performance.now();
                    };
                } else if (typeof process !== 'undefined' && process !== null && process.hrtime) {
                    module.exports = function () {
                        return (getNanoSeconds() - loadTime) / 1000000;
                    };
                    hrtime = process.hrtime;
                    getNanoSeconds = function () {
                        var hr;
                        hr = hrtime();
                        return hr[0] * 1000000000 + hr[1];
                    };
                    loadTime = getNanoSeconds();
                } else if (Date.now) {
                    module.exports = function () {
                        return Date.now() - loadTime;
                    };
                    loadTime = Date.now();
                } else {
                    module.exports = function () {
                        return new Date().getTime() - loadTime;
                    };
                    loadTime = new Date().getTime();
                }
            }.call(this));
        }
    ];
    return _require(4);
}));
//# sourceMappingURL=futoin-asyncsteps.js.map