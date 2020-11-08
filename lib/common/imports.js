"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCode = exports.normalize = void 0;
var os_1 = require("os");
var string_1 = require("@quenk/noni/lib/data/string");
var record_1 = require("@quenk/noni/lib/data/record");
/**
 * normalize converts a string (usually a path to an appropriate syntax for use
 * as a variable name.
 */
exports.normalize = function (name) {
    return string_1.uncapitalize(string_1.camelCase(name.replace(/[.]/g, 'dot').replace(/[^\w]/g, '_')));
};
/**
 * toCode converts an Imports object into a TypeScript string.
 */
exports.toCode = function (imps, eol) {
    if (eol === void 0) { eol = os_1.EOL; }
    return record_1.reduce(imps, [], function (p, c, k) {
        return __spreadArrays(p, ["import * as " + k + " from '" + c + "'; "]);
    }).join(eol);
};
//# sourceMappingURL=imports.js.map