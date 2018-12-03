"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ast = require("@quenk/rcl/lib/ast");
var os_1 = require("os");
var record_1 = require("@quenk/noni/lib/data/record");
var match_1 = require("@quenk/noni/lib/control/match");
var future_1 = require("@quenk/noni/lib/control/monad/future");
var rcl_1 = require("@quenk/rcl");
/**
 * newContext constructor function.
 */
exports.newContext = function (loader) {
    return record_1.merge({ loader: loader, rcl: exports.parse }, {
        EOL: os_1.EOL
    });
};
/**
 * file2Imports extracts the imports for a File
 */
exports.file2Imports = function (f) {
    return f.imports.reduce(addImport, {});
};
var addImport = function (p, c) { return match_1.match(c)
    .caseOf(ast.MemberImport, addMemberImport(p))
    .caseOf(ast.QualifiedImport, addQualifiedImport(p))
    .end(); };
var addMemberImport = function (p) { return function (_a) {
    var members = _a.members, module = _a.module;
    return record_1.merge(p, (_b = {}, _b[module.value] = members.map(function (m) { return m.value; }), _b));
    var _b;
}; };
var addQualifiedImport = function (p) { return function (_a) {
    var module = _a.module, id = _a.id;
    return record_1.merge(p, (_b = {}, _b[module.value] = id, _b));
    var _b;
}; };
/**
 * imports2TS converts a map of imports to
 * the relevant TypeScript import blocks.
 */
exports.imports2TS = function (i) {
    return record_1.reduce(i, [], function (p, c, k) {
        return Array.isArray(c) ? p.concat(["import { " + c.join(',') + " } from '" + k + "';"]) : p.concat(["import * as " + c + " from '" + k + "';"]);
    }).join(os_1.EOL);
};
/**
 * file2TS transforms a file into a function for installing
 * routes.
 *
 * This writes only the function and not imports.
 */
exports.file2TS = function (ctx, f) {
    return (loadFileRec(ctx)(f))
        .map(fileRoutes2TS)
        .map(wrapInFunc);
};
var loadFileRec = function (ctx) { return function (f) {
    return future_1.parallel(f.includes.map(function (p) { return loadFile(ctx, p.path.value); })).map(mergeRs(f));
}; };
var loadFile = function (ctx, path) {
    return ctx
        .loader(path)
        .chain(ctx.rcl)
        .chain(loadFileRec(ctx));
};
var mergeRs = function (f) { return function (list) {
    return list.reduce(function (p, c) {
        p.routes = c.routes.concat(p.routes);
        return p;
    }, f);
}; };
var fileRoutes2TS = function (f) {
    return f
        .routes
        .reduce(onlyRoutes2TS, [])
        .join('');
};
var onlyRoutes2TS = function (p, c) {
    return (c instanceof ast.Route) ? p.concat(route2TS(c)) : p;
};
var wrapInFunc = function (ts) {
    return "(_m:Module) => {" + os_1.EOL + os_1.EOL + ts + os_1.EOL + "}";
};
var route2TS = function (r) {
    return "_m.install(" + method2TS(r.method) + "," + pattern2TS(r.pattern) + "," +
        ("[" + r.filters.map(filter2TS).join(',') + "].concat(") +
        ("[" + (r.view ? ',' + view2TS(r.view) : '') + "]));" + os_1.EOL);
};
var method2TS = function (m) {
    return "'" + m.toLowerCase() + "'";
};
var pattern2TS = function (p) {
    return "'" + p.value + "'";
};
var view2TS = function (view) { return (view) ?
    "()=>pure(show(" + literal2TS(view.view) + ", " +
        (dict2TS(view.context) + "))") :
    ''; };
var filter2TS = function (f) {
    return "" + identifier2TS(f.value) +
        ("" + (f.invoked ? '(' + f.args.map(value2TS).join(',') + ')' : ''));
};
var value2TS = function (n) { return match_1.match(n)
    .caseOf(ast.List, list2TS)
    .caseOf(ast.Dict, dict2TS)
    .caseOf(ast.StringLiteral, literal2TS)
    .caseOf(ast.NumberLiteral, literal2TS)
    .caseOf(ast.BooleanLiteral, literal2TS)
    .caseOf(ast.EnvVar, envVar2Ts)
    .caseOf(ast.UnqualifiedIdentifier, identifier2TS)
    .caseOf(ast.QualifiedIdentifier, identifier2TS)
    .end(); };
var list2TS = function (l) {
    return "[" + l.elements.map(value2TS).join(',') + "]";
};
var dict2TS = function (d) {
    var props = d.properties.map(function (p) { return value2TS(p.key) + ": " + value2TS(p.value); });
    return "{ " + props.join(',\n') + " }";
};
var literal2TS = function (n) {
    return (n instanceof ast.StringLiteral) ? "`" + n.value + "`" : n.value;
};
var envVar2Ts = function (n) {
    return "process.env['" + value2TS(n.key) + "']";
};
var identifier2TS = function (i) { return match_1.match(i)
    .caseOf(ast.QualifiedIdentifier, qualifiedIdentifier2TS)
    .caseOf(ast.UnqualifiedIdentifier, unqualifiedIdentifier2TS)
    .end(); };
var qualifiedIdentifier2TS = function (n) {
    return n.path.map(unqualifiedIdentifier2TS).join(',');
};
var unqualifiedIdentifier2TS = function (n) {
    return n.value;
};
/**
 * parse source text into an rcl File node.
 */
exports.parse = function (src) {
    return rcl_1.parse(src, rcl_1.tree)
        .map(function (n) { return (n instanceof ast.File) ? future_1.pure(n) : future_1.raise(notFile(n)); })
        .orRight(future_1.raise)
        .map(function (f) { return f; })
        .takeRight();
};
var notFile = function (n) {
    return new Error("Expected a valid file got \"" + n.type + "\" after parsing!");
};
/**
 * compile some source text into TypeScript code.
 */
exports.compile = function (src, ctx) {
    return exports.parse(src).chain(function (f) { return exports.file2TS(ctx, f); });
};
//# sourceMappingURL=rcl.js.map