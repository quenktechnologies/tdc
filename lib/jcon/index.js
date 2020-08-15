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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.value2TS = exports.flattenImports = exports.getAllImports = exports.wrapDirectives = exports.flattenCodeStruct = exports.parseJCONFile = exports.getAllDirectives = exports.compile = exports.parse = exports.newContext = void 0;
var ast = require("@quenk/jcon/lib/ast");
var os_1 = require("os");
var future_1 = require("@quenk/noni/lib/control/monad/future");
var record_1 = require("@quenk/noni/lib/data/record");
var path_1 = require("@quenk/noni/lib/data/record/path");
var array_1 = require("@quenk/noni/lib/data/array");
var string_1 = require("@quenk/noni/lib/data/string");
var type_1 = require("@quenk/noni/lib/data/type");
var match_1 = require("@quenk/noni/lib/control/match");
var jcon_1 = require("@quenk/jcon");
/**
 * newContext constructor function.
 */
exports.newContext = function (loader) {
    return record_1.merge({ loader: loader, jcon: exports.parse }, {
        imports: {},
        output: [],
        tendril: '@quenk/tendril',
        EOL: os_1.EOL
    });
};
/**
 * parse jcon source text into an Abstract Syntax Tree (AST).
 *
 * The [[ast.File|File]] node is always the root node of the AST.
 */
exports.parse = function (src) {
    var mfile = jcon_1.parse(src);
    if (mfile.isLeft())
        return onParseError(mfile.takeLeft());
    return future_1.pure(mfile.takeRight());
};
var onParseError = function (e) { return future_1.raise(new Error("An error occurred while parsing file the provided source " +
    ("text: \n " + e.message))); };
/**
 * compile some an AST into the TypeScript code.
 */
exports.compile = function (ctx, file) {
    return future_1.doFuture(function () {
        var dirs, props, code;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.getAllDirectives(ctx, file)];
                case 1:
                    dirs = _a.sent();
                    props = dirs.filter(function (d) {
                        return (d instanceof ast.Property);
                    });
                    code = dict2TS(ctx, new ast.Dict(props, {}));
                    return [2 /*return*/, future_1.pure(exports.wrapDirectives(ctx, dirs, code))];
            }
        });
    });
};
var paths2TS = function (paths) {
    return paths.map(function (p) { return "[" + p.value + "]"; }).join('');
};
/**
 * getAllDirectives provides the directives of a File (and all included files).
 */
exports.getAllDirectives = function (ctx, f) {
    return future_1.doFuture(function () {
        var work, results, flatResults;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    work = f.includes.map(function (i) { return future_1.doFuture(function () {
                        var path, file, childDirectives;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    path = i.path;
                                    return [4 /*yield*/, exports.parseJCONFile(ctx, path.value)];
                                case 1:
                                    file = _a.sent();
                                    return [4 /*yield*/, exports.getAllDirectives(ctx, file)];
                                case 2:
                                    childDirectives = _a.sent();
                                    return [2 /*return*/, future_1.pure(__spreadArrays(childDirectives, file.directives))];
                            }
                        });
                    }); });
                    return [4 /*yield*/, future_1.sequential(work)];
                case 1:
                    results = _a.sent();
                    flatResults = results.reduce(function (p, c) { return p.concat(c); }, []);
                    return [2 /*return*/, future_1.pure(__spreadArrays(flatResults, f.directives))];
            }
        });
    });
};
/**
 * parseJCONFile at the specified path.
 *
 * A [[ast.File]] node is returned on success.
 */
exports.parseJCONFile = function (ctx, path) {
    return ctx
        .loader(path)
        .chain(exports.parse)
        .catch(onParseFileError(path));
};
var onParseFileError = function (path) { return function (e) { return future_1.raise(new Error("An error occurred while parsing file at " +
    ("\"" + path + "\":\n " + e.message))); }; };
/**
 * flattenCodeStruct converts a Record of Code strings into
 * a single string representing the record in TypeScript output.
 */
exports.flattenCodeStruct = function (ctx, rec) {
    var tokens = record_1.reduce(rec, [], function (p, c, k) {
        var value = type_1.isObject(c) ? exports.flattenCodeStruct(ctx, c) : c;
        return p.concat("'" + k + "': " + value);
    });
    return "{" + tokens.join("," + ctx.EOL) + '}';
};
/**
 * wrapDirectives in the import preamble and associated export statement.
 *
 * This function makes the generated TypeScript ready for use.
 */
exports.wrapDirectives = function (ctx, dirs, code) {
    return [
        exports.flattenImports(ctx, exports.getAllImports(dirs)),
        "import {Template} from " + ctx.tendril + "/lib/app/module/template';",
        "",
        "export const template: Template<App> =",
        code
    ].join(ctx.EOL);
};
/**
 * getAllImports provides a Record containing all the imports (via module
 * pointer syntax) found in the list of directives provided.
 */
exports.getAllImports = function (dirs) {
    return dirs.reduce(function (p, c) {
        if (c instanceof ast.Property) {
            var value = c.value;
            if (value instanceof ast.Member)
                return addImports(p, value);
            else if (value instanceof ast.List)
                return addImportsInList(p, value);
            else if (value instanceof ast.Dict)
                return addImportsInDict(p, value);
        }
        return p;
    }, {});
};
var addImports = function (rec, m) {
    return path_1.set(normalizeId(array_1.tail(m.module.module.split('/'))), m.module.module, rec);
};
var addImportsInList = function (rec, l) {
    return l.elements.reduce(function (p, c) { return (c instanceof ast.Member) ?
        addImports(p, c) : rec; }, rec);
};
var addImportsInDict = function (rec, d) {
    return d.properties.reduce(function (rec, c) { return (c.value instanceof ast.Member) ?
        addImports(rec, c.value) : rec; }, rec);
};
var normalizeId = function (str) {
    return string_1.uncapitalize(string_1.camelCase(str));
};
/**
 * flattenImports into a TypeScript string.
 */
exports.flattenImports = function (ctx, i) {
    return record_1.reduce(i, [], function (p, c, k) {
        return __spreadArrays(p, ["import * as " + k + " from '" + c + "'; "]);
    }).join(ctx.EOL);
};
/**
 * value2TS transforms one of the valid value nodes into a TypeScript string.
 */
exports.value2TS = function (ctx, n) { return match_1.match(n)
    .caseOf(ast.Member, function (n) { return member2TS(ctx, n); })
    .caseOf(ast.Var, function (n) { return var2TS(ctx, n); })
    .caseOf(ast.EnvVar, function (n) { return envVar2Ts(ctx, n); })
    .caseOf(ast.List, function (n) { return list2TS(ctx, n); })
    .caseOf(ast.Dict, function (n) { return dict2TS(ctx, n); })
    .caseOf(ast.StringLiteral, literal2TS)
    .caseOf(ast.NumberLiteral, literal2TS)
    .caseOf(ast.BooleanLiteral, literal2TS)
    .caseOf(ast.Identifier, literal2TS)
    .end(); };
var member2TS = function (ctx, m) {
    return normalizeId(array_1.tail(m.module.module.split('/'))) + "." +
        (m.invocation ?
            "" + exports.value2TS(ctx, m.member) +
                ("(" + m.parameters.map(function (p) { return exports.value2TS(ctx, p); }).join(',') + ")") :
            exports.value2TS(ctx, m.member));
};
var var2TS = function (ctx, n) {
    return n.filters.reduce(function (p, c) {
        return literal2TS(c.name) + "(" + p + ")";
    }, exports.value2TS(ctx, n.key));
};
var envVar2Ts = function (ctx, n) {
    return n.filters.reduce(function (p, c) { return literal2TS(c.name) + "(" + p + ")"; }, "(<string>process.env['" + exports.value2TS(ctx, n.key) + "'])");
};
var list2TS = function (ctx, l) {
    return "[" + l.elements.map(function (n) { return exports.value2TS(ctx, n); }).join(',') + "]";
};
var dict2TS = function (ctx, d) {
    return exports.flattenCodeStruct(ctx, structFromDict(ctx, d));
};
var literal2TS = function (n) {
    return (n instanceof ast.StringLiteral) ? "`" + n.value + "`" : n.value;
};
var structFromDict = function (ctx, src) {
    return src.properties.reduce(function (prev, prop) {
        var path = paths2TS(prop.path);
        var value = (prop.value instanceof ast.Dict) ?
            structFromDict(ctx, prop.value) :
            exports.value2TS(ctx, prop.value);
        return path_1.set(path, value, prev);
    }, {});
};
//# sourceMappingURL=index.js.map