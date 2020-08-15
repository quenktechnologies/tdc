"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureID = void 0;
var ast = require("@quenk/jcon/lib/ast");
/**
 * ensureID ensures a parsed conf file has an id.
 *
 * If there is no id property at the root level then the passed defaultID
 * will be used.
 */
exports.ensureID = function (f, id) {
    var hasId = f.directives.some(function (p) { return (p instanceof ast.Property) &&
        (p.path[0].value === 'id'); });
    return hasId ? f : new ast.File(f.includes, __spreadArrays([
        new ast.Property([new ast.Identifier('id', {})], new ast.StringLiteral(id, {}), {})
    ], f.directives), {});
};
//# sourceMappingURL=transform.js.map