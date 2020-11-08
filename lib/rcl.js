"use strict";
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIncludes = exports.file2TS = exports.getAllImports = exports.compile = exports.parse = exports.newContext = void 0;
var ast = require("@quenk/rcl/lib/ast");
var os_1 = require("os");
var record_1 = require("@quenk/noni/lib/data/record");
var path_1 = require("@quenk/noni/lib/data/record/path");
var match_1 = require("@quenk/noni/lib/control/match");
var array_1 = require("@quenk/noni/lib/data/array");
var future_1 = require("@quenk/noni/lib/control/monad/future");
var rcl_1 = require("@quenk/rcl");
var imports_1 = require("./common/imports");
/**
 * newContext constructor function.
 */
exports.newContext = function (loader) {
    return record_1.merge({ loader: loader, rcl: exports.parse, locals: [] }, {});
};
/**
 * parse source text into an rcl File node.
 */
exports.parse = function (src) {
    return future_1.fromCallback(function (cb) {
        var eresult = rcl_1.parse(src, rcl_1.tree);
        if (eresult.isLeft()) {
            var msg = eresult.takeLeft().message;
            cb(new Error("rcl: Error while parsing source text: \n " + msg));
        }
        else {
            cb(null, eresult.takeRight());
        }
    });
};
/**
 * compile some source text into Code code.
 */
exports.compile = function (src, ctx) {
    return exports.parse(src).chain(function (f) { return exports.file2TS(ctx, f); });
};
/**
 * getAllImports provides an Imports object containing all the imports found
 * in a file based on detected module pointer syntax usage.
 */
exports.getAllImports = function (file) {
    return file.body.reduce(function (imps, node) {
        if (node instanceof ast.Set)
            return takeImports(imps, node.value);
        else if (node instanceof ast.Route)
            return node.filters.reduce(takeImports, imps);
        else
            return imps;
    }, {});
};
var takeImports = function (imps, node) {
    if (node instanceof ast.ModuleMember) {
        var module_1 = node.module;
        return path_1.set(imports_1.normalize(module_1), module_1, imps);
    }
    else if (node instanceof ast.FunctionCall) {
        return takeImportsFromFuncCall(imps, node);
    }
    else if (node instanceof ast.List) {
        return takeImportsFromList(imps, node);
    }
    else if (node instanceof ast.Dict) {
        return takeImportsFromDict(imps, node);
    }
    else {
        return imps;
    }
};
var takeImportsFromList = function (imps, node) {
    return node.elements.reduce(takeImports, imps);
};
var takeImportsFromDict = function (imps, node) {
    return node.properties.reduce(function (p, c) { return takeImports(p, c.value); }, imps);
};
var takeImportsFromFuncCall = function (imps, node) {
    return node.args.reduce(takeImports, takeImports(imps, node.id));
};
/**
 * file2TS transforms a file into a function for installing
 * routes.
 *
 * This writes only the function and not imports.
 */
exports.file2TS = function (ctx, node) {
    return future_1.doFuture(function () {
        var file, nodes, code;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.resolveIncludes(ctx, node)];
                case 1:
                    file = _a.sent();
                    nodes = file.body.filter(function (n) {
                        return !(n instanceof ast.Comment);
                    });
                    code = ["($module:Module) => {" + os_1.EOL + os_1.EOL];
                    code.push('let $routes = [];', os_1.EOL);
                    nodes.forEach(function (bodyNode) {
                        if (bodyNode instanceof ast.Set) {
                            code.push(set2TS(ctx, bodyNode));
                            code.push(os_1.EOL);
                        }
                        else if (bodyNode instanceof ast.Route) {
                            code.push(os_1.EOL);
                            code.push('$routes.push(');
                            code.push(route2TS(bodyNode));
                            code.push(');');
                            code.push(os_1.EOL);
                        }
                    });
                    code.push('return $routes;');
                    code.push(os_1.EOL);
                    code.push('}');
                    return [2 /*return*/, future_1.pure(code.join(''))];
            }
        });
    });
};
/**
 * resolveIncludes found in a File node.
 *
 * This merges the contents of each [[ast.Include]] found into the passed
 * [[ast.File]].
 */
exports.resolveIncludes = function (ctx, node) {
    return future_1.doFuture(function () {
        var work, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    work = future_1.parallel(node.body.map(function (n) { return future_1.doFuture(function () {
                        var txt, _file, file;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!(n instanceof ast.Include)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, ctx.loader(n.path.value)];
                                case 1:
                                    txt = _a.sent();
                                    return [4 /*yield*/, ctx.rcl(txt)];
                                case 2:
                                    _file = _a.sent();
                                    return [4 /*yield*/, exports.resolveIncludes(ctx, _file)];
                                case 3:
                                    file = _a.sent();
                                    return [2 /*return*/, future_1.pure(file.body)];
                                case 4: return [2 /*return*/, future_1.pure(n)];
                            }
                        });
                    }); }));
                    _a = node;
                    _b = array_1.flatten;
                    return [4 /*yield*/, work];
                case 1:
                    _a.body = _b.apply(void 0, [_c.sent()]);
                    return [2 /*return*/, future_1.pure(node)];
            }
        });
    });
};
var set2TS = function (ctx, node) {
    var id = node.id.value;
    var assignment = id + " = " + value2TS(node.value) + ";";
    if (!array_1.contains(ctx.locals, id)) {
        ctx.locals.push(id);
        return "let " + assignment;
    }
    else {
        return assignment;
    }
};
var route2TS = function (node) {
    var code = [];
    code.push('{', os_1.EOL);
    code.push('method:', "'" + node.method.toLowerCase() + "'", ',', os_1.EOL);
    code.push('path:', "'" + node.pattern.value + "'", ',', os_1.EOL);
    code.push('filters:');
    code.push('[');
    var filters = node.filters.map(function (f) {
        var out = value2TS(f);
        if (f instanceof ast.FunctionCall) {
            return "// @ts-ignore: 6133\n                ($request: Request)=> {\n\n                  // @ts-ignore: 6133\n                 let $params:_json.Object = $request.params || {};\n                 // @ts-ignore: 6133\n                 let $query: _json.Object = $request.query || {};\n                 //@ts-ignore: 6133\n                 let $body = _json.Value = $request.body;\n\n                 return " + out + ";\n        }";
        }
        else {
            return out;
        }
    }).join(',');
    code.push(filters);
    if (node.view)
        code.push(view2TS(node.view));
    code.push(']');
    code.push('}');
    return code.join('');
};
var view2TS = function (view) { return (view) ?
    "$module.show(" + literal2TS(view.view) + ", " +
        (dict2TS(view.context) + ")") :
    ''; };
var value2TS = function (node) { return match_1.match(node)
    .caseOf(ast.FunctionCall, functionCall2TS)
    .caseOf(ast.ModuleMember, modueMember2TS)
    .caseOf(ast.List, list2TS)
    .caseOf(ast.Dict, dict2TS)
    .caseOf(ast.StringLiteral, literal2TS)
    .caseOf(ast.NumberLiteral, literal2TS)
    .caseOf(ast.BooleanLiteral, literal2TS)
    .caseOf(ast.EnvVar, envVar2TS)
    .caseOf(ast.Identifier, anyIdentifier2TS)
    .caseOf(ast.QualifiedIdentifier, anyIdentifier2TS)
    .end(); };
var functionCall2TS = function (_a) {
    var id = _a.id, args = _a.args;
    var name = (id instanceof ast.ModuleMember) ?
        modueMember2TS(id) : anyIdentifier2TS(id);
    var argsStr = args.map(value2TS).join(',');
    var ret = name + "(" + argsStr + ")";
    var target = array_1.tail(name.split('.'));
    var isConstructor = target[0] === target[0].toUpperCase();
    return isConstructor ? "new " + ret : ret;
};
var modueMember2TS = function (_a) {
    var module = _a.module, member = _a.member;
    return imports_1.normalize(module) + "." + member.value;
};
var list2TS = function (_a) {
    var elements = _a.elements;
    return "[" + elements.map(value2TS).join(',') + "]";
};
var dict2TS = function (_a) {
    var properties = _a.properties;
    return "{" +
        properties.map(function (p) {
            return value2TS(p.key) + ": " + value2TS(p.value) + " ";
        }).join('\n') +
        '}';
};
var literal2TS = function (node) {
    return (node instanceof ast.StringLiteral) ? "`" + node.value + "`" : node.value;
};
var envVar2TS = function (node) {
    return "process.env['" + value2TS(node.key) + "']";
};
var anyIdentifier2TS = function (i) { return match_1.match(i)
    .caseOf(ast.Identifier, identifier2TS)
    .caseOf(ast.QualifiedIdentifier, qualifiedIdentifier2TS)
    .end(); };
var qualifiedIdentifier2TS = function (node) {
    return node.path.map(identifier2TS).join('.');
};
var identifier2TS = function (node) { return node.value; };
//# sourceMappingURL=rcl.js.map