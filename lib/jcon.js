"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ast = require("@quenk/jcon/lib/ast");
var os_1 = require("os");
var property_seek_1 = require("property-seek");
var future_1 = require("@quenk/noni/lib/control/monad/future");
var record_1 = require("@quenk/noni/lib/data/record");
var array_1 = require("@quenk/noni/lib/data/array");
var string_1 = require("@quenk/noni/lib/data/string");
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
 * file2TS transforms a File node into TypeScript.
 */
exports.file2TS = function (ctx, f) {
    return (loadFileRec(ctx)(f)).map(compileDs(ctx));
};
var loadFileRec = function (ctx) { return function (f) {
    return future_1.parallel(f.includes.map(function (p) { return loadFile(ctx, p.path.value); })).map(mergeDs(f));
}; };
var loadFile = function (ctx, path) {
    return ctx
        .loader(path)
        .chain(ctx.jcon)
        .chain(loadFileRec(ctx));
};
var mergeDs = function (f) { return function (list) {
    return list.reduce(function (p, c) {
        p.directives = c.directives.concat(p.directives);
        return p;
    }, f);
}; };
var compileDs = function (ctx) { return function (f) {
    return candidate2TS(ctx, f
        .directives
        .reduce(makePotentials, {}));
}; };
var candidate2TS = function (ctx, st) { return (typeof st === 'string') ?
    st :
    '{' + record_1.reduce(st, [], function (p, c, k) {
        return p.concat("'" + k + "': " + candidate2TS(ctx, c));
    })
        .join("," + ctx.EOL)
        .concat('}'); };
var makePotentials = function (p, c) { return (c instanceof ast.Property) ?
    property_seek_1.set(c.path.map(function (i) { return i.value; }).join('.'), exports.value2TS(c.value), p) :
    p; };
/**
 * value2TS transforms one of the Value nodes into its TypeScript
 * equivelant.
 */
exports.value2TS = function (n) { return match_1.match(n)
    .caseOf(ast.Member, member2TS)
    .caseOf(ast.EnvVar, envVar2Ts)
    .caseOf(ast.List, list2TS)
    .caseOf(ast.Dict, dict2TS)
    .caseOf(ast.StringLiteral, literal2TS)
    .caseOf(ast.NumberLiteral, literal2TS)
    .caseOf(ast.BooleanLiteral, literal2TS)
    .caseOf(ast.Identifier, literal2TS)
    .caseOf(ast.ArrowFunction, arrowFunction2TS)
    .end(); };
var member2TS = function (m) {
    return normalizeId(array_1.tail(m.module.module.split('/'))) + "." +
        (m.invocation ?
            exports.value2TS(m.member) + "(" + m.parameters.map(exports.value2TS).join(',') + ")" :
            exports.value2TS(m.member));
};
var envVar2Ts = function (n) {
    return "process.env['" + exports.value2TS(n.key) + "']";
};
var list2TS = function (l) {
    return "[" + l.elements.map(exports.value2TS).join(',') + "]";
};
var dict2TS = function (d) {
    var props = d.properties.map(function (p) { return exports.value2TS(p.key) + ": " + exports.value2TS(p.value); });
    return "{ " + props.join(',\n') + " }";
};
var literal2TS = function (n) {
    return (n instanceof ast.StringLiteral) ? "'`" + n.value + "`" : n.value;
};
var arrowFunction2TS = function (n) {
    return n.body;
};
var wrapOutput = function (ctx, f) { return function (ts) {
    var i = exports.file2Imports(ctx, f);
    return future_1.pure("" + i + ctx.EOL + "import {Template} from " +
        ("'" + ctx.tendril + "/lib/app/module/template';") +
        ("" + ctx.EOL + ctx.EOL + " ") +
        ("export const template: Template = " + ctx.EOL + " " + ts));
}; };
/**
 * file2Imports extracts a list of TypeScript imports from a File node.
 */
exports.file2Imports = function (ctx, f) {
    return flattenImports(ctx, f
        .directives
        .reduce(function (p, c) { return (c instanceof ast.Property) ?
        value2Imports(ctx, p, c.value) :
        p; }, {}));
};
var value2Imports = function (ctx, p, c) {
    return match_1.match(c)
        .caseOf(ast.Member, member2Import(p))
        .caseOf(ast.List, list2Import(ctx, p))
        .caseOf(ast.Dict, dict2Import(ctx, p))
        .orElse(function () { return p; })
        .end();
};
var member2Import = function (p) { return function (m) {
    return property_seek_1.set(normalizeId(array_1.tail(m.module.module.split('/'))), m.module.module, p);
}; };
var list2Import = function (ctx, p) { return function (l) {
    return l.elements.reduce(function (p, c) { return value2Imports(ctx, p, c); }, p);
}; };
var dict2Import = function (ctx, i) { return function (d) {
    return d.properties.reduce(function (p, c) { return value2Imports(ctx, p, c.value); }, i);
}; };
var normalizeId = function (str) {
    return string_1.uncapitalize(string_1.camelCase(str));
};
var flattenImports = function (ctx, i) {
    return record_1.reduce(i, [], function (p, c, k) {
        return p.concat(["import * as " + k + " from '" + c + "'; "]);
    }).join(ctx.EOL);
};
/**
 * parse source text into a File node.
 */
exports.parse = function (src) {
    return jcon_1.parse(src, jcon_1.tree)
        .map(function (n) { return (n instanceof ast.File) ? future_1.pure(n) : future_1.raise(notFile(n)); })
        .orRight(future_1.raise)
        .map(function (f) { return f; })
        .takeRight();
};
var notFile = function (n) {
    return new Error("Expected a valid file got \"" + n.type + "\"!");
};
/**
 * compile some source text into TypeScript code.
 */
exports.compile = function (src, ctx) {
    return exports.parse(src)
        .chain(function (f) { return exports.file2TS(ctx, f)
        .chain(wrapOutput(ctx, f)); });
};
//# sourceMappingURL=jcon.js.map