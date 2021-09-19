"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCode = exports.normalize = void 0;
const os_1 = require("os");
const string_1 = require("@quenk/noni/lib/data/string");
const record_1 = require("@quenk/noni/lib/data/record");
/**
 * normalize converts a string (usually a path to an appropriate syntax for use
 * as a variable name.
 */
const normalize = (name) => (0, string_1.uncapitalize)((0, string_1.camelcase)(name.replace(/[.]/g, 'dot').replace(/[^\w]/g, '_')));
exports.normalize = normalize;
/**
 * toCode converts an Imports object into a TypeScript string.
 */
const toCode = (imps, eol = os_1.EOL) => (0, record_1.reduce)(imps, [], (p, c, k) => [...p, `import * as ${k} from '${c}'; `]).join(eol);
exports.toCode = toCode;
//# sourceMappingURL=imports.js.map