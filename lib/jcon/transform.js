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
exports.transformTree = exports.flattenDirectives = exports.addProperties = void 0;
var ast = require("@quenk/jcon/lib/ast");
var path_1 = require("path");
var future_1 = require("@quenk/noni/lib/control/monad/future");
var util_1 = require("./util");
/**
 * addProperties adds special properties useful for module configuration.
 *
 * Currently these are:
 *
 * 1. id (uses the module basename if not provided)
 * 2. app.dirs.self
 */
exports.addProperties = function (ctx, f) {
    var hasId = f.directives.some(function (p) { return (p instanceof ast.Property) &&
        (p.path[0].value === 'id'); });
    return hasId ? f : new ast.File(f.includes, __spreadArrays([
        new ast.Property([new ast.Identifier('id', {})], new ast.StringLiteral(path_1.basename(ctx.path), {}), {}),
        new ast.Property([
            new ast.Identifier('app', {}),
            new ast.Identifier('dirs', {}),
            new ast.Identifier('self', {})
        ], new ast.StringLiteral(ctx.path, {}), {})
    ], f.directives), {});
};
/**
 * flattenDirectives loads the directives of all the includes and makes them
 * available to the root File.
 */
exports.flattenDirectives = function (ctx, f) {
    return future_1.doFuture(function () {
        var dirs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, util_1.getAllDirectives(ctx, f)];
                case 1:
                    dirs = _a.sent();
                    return [2 /*return*/, future_1.pure(new ast.File(f.includes, dirs, f.location))];
            }
        });
    });
};
/**
 * transformTree applies all the transforms to the AST in one go.
 */
exports.transformTree = function (ctx, f) {
    return future_1.doFuture(function () {
        var file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.flattenDirectives(ctx, f)];
                case 1:
                    file = _a.sent();
                    return [2 /*return*/, future_1.pure(exports.addProperties(ctx, file))];
            }
        });
    });
};
//# sourceMappingURL=transform.js.map