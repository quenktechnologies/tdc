"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.value2TS = exports.file2TS = exports.getAllImports = exports.wrapDirectives = exports.flattenCodeStruct = exports.parseJCONFile = exports.compile = exports.parse = exports.newContext = void 0;
const ast = require("@quenk/jcon/lib/ast");
const os_1 = require("os");
const future_1 = require("@quenk/noni/lib/control/monad/future");
const record_1 = require("@quenk/noni/lib/data/record");
const path_1 = require("@quenk/noni/lib/data/record/path");
const type_1 = require("@quenk/noni/lib/data/type");
const match_1 = require("@quenk/noni/lib/control/match");
const jcon_1 = require("@quenk/jcon");
const imports_1 = require("../common/imports");
const transform_1 = require("./transform");
/**
 * newContext creates a new compilation context.
 */
const newContext = (path, loader) => (0, record_1.merge)({ loader, jcon: exports.parse }, {
    path,
    root: path,
    imports: {},
    output: [],
    tendril: '@quenk/tendril',
    EOL: os_1.EOL
});
exports.newContext = newContext;
/**
 * parse jcon source text into an Abstract Syntax Tree (AST).
 *
 * The [[ast.File|File]] node is always the root node of the AST.
 */
const parse = (src) => (0, future_1.fromCallback)(cb => {
    let eresult = (0, jcon_1.parse)(src);
    if (eresult.isLeft()) {
        let msg = eresult.takeLeft().message;
        cb(new Error(`jcon: Error while parsing source text: \n ${msg}`));
    }
    else {
        cb(null, eresult.takeRight());
    }
});
exports.parse = parse;
/**
 * compile a parsed file into TypeScript code.
 */
const compile = (ctx, file) => (0, future_1.doFuture)(function* () {
    let f = yield (0, transform_1.transformTree)(ctx, file);
    return (0, future_1.pure)((0, exports.wrapDirectives)(ctx, f.directives, (0, exports.file2TS)(ctx, f)));
});
exports.compile = compile;
const paths2TS = (paths) => paths.map(p => `[${p.value}]`).join('');
/**
 * parseJCONFile at the specified path.
 *
 * A [[ast.File]] node is returned on success.
 */
const parseJCONFile = (ctx, path) => ctx
    .loader(path)
    .chain(exports.parse)
    .trap(onParseFileError(path));
exports.parseJCONFile = parseJCONFile;
const onParseFileError = (path) => (e) => (0, future_1.raise)(new Error(`An error occurred while parsing file at ` +
    `"${path}":\n ${e.message}`));
/**
 * flattenCodeStruct converts a Record of Code strings into
 * a single string representing the record in TypeScript output.
 */
const flattenCodeStruct = (ctx, rec) => {
    let tokens = (0, record_1.reduce)(rec, [], (p, c, k) => {
        let value = (0, type_1.isObject)(c) ? (0, exports.flattenCodeStruct)(ctx, c) : c;
        return p.concat(`'${k}': ${value}`);
    });
    return `{` + tokens.join(`,${ctx.EOL}`) + '}';
};
exports.flattenCodeStruct = flattenCodeStruct;
/**
 * wrapDirectives in the import preamble and associated export statement.
 *
 * This function makes the generated TypeScript ready for use.
 */
const wrapDirectives = (ctx, dirs, code) => [
    (0, imports_1.toCode)((0, exports.getAllImports)(dirs), ctx.EOL),
    `import {Template} from ${ctx.tendril}/lib/app/module/template';`,
    ``,
    `export const template: Template<App> =`,
    code
].join(ctx.EOL);
exports.wrapDirectives = wrapDirectives;
/**
 * getAllImports provides a Record containing all the imports (via module
 * pointer syntax) found in the list of directives provided.
 */
const getAllImports = (dirs) => dirs.reduce((p, c) => (c instanceof ast.Property) ?
    addImports(p, c.value) : p, {});
exports.getAllImports = getAllImports;
const addImports = (imps, node) => {
    if (node instanceof ast.Member) {
        imps = (0, path_1.set)((0, imports_1.normalize)(node.module.module), node.module.module, imps);
        return node.parameters.reduce((prev, param) => addImports(prev, param), imps);
    }
    else if (node instanceof ast.List) {
        return addImportsInList(imps, node);
    }
    else if (node instanceof ast.Dict) {
        return addImportsInDict(imps, node);
    }
    else {
        return imps;
    }
};
const addImportsInList = (imps, node) => node.elements.reduce(addImports, imps);
const addImportsInDict = (imps, node) => node.properties.reduce((p, c) => addImports(p, c.value), imps);
/**
 * file2TS converts the body of a parsed file into code.
 *
 * Note: This only outputs the object, not the surronding imports and preamble.
 */
const file2TS = (ctx, f) => {
    // Filter out comments.
    let props = f.directives.filter(d => (d instanceof ast.Property));
    return dict2TS(ctx, new ast.Dict(props, {}));
};
exports.file2TS = file2TS;
/**
 * value2TS transforms one of the valid value nodes into a TypeScript string.
 */
const value2TS = (ctx, n) => (0, match_1.match)(n)
    .caseOf(ast.Member, (n) => member2TS(ctx, n))
    .caseOf(ast.Var, (n) => var2TS(ctx, n))
    .caseOf(ast.EnvVar, (n) => envVar2Ts(ctx, n))
    .caseOf(ast.List, (n) => list2TS(ctx, n))
    .caseOf(ast.Dict, (n) => dict2TS(ctx, n))
    .caseOf(ast.Function, (n) => n.body)
    .caseOf(ast.StringLiteral, literal2TS)
    .caseOf(ast.NumberLiteral, literal2TS)
    .caseOf(ast.BooleanLiteral, literal2TS)
    .caseOf(ast.Identifier, literal2TS)
    .end();
exports.value2TS = value2TS;
const member2TS = (ctx, m) => `${(0, imports_1.normalize)(m.module.module)}.` +
    (m.invocation ?
        `${(0, exports.value2TS)(ctx, m.member)}` +
            `(${m.parameters.map(p => (0, exports.value2TS)(ctx, p)).join(',')})` :
        (0, exports.value2TS)(ctx, m.member));
const var2TS = (ctx, n) => n.filters.reduce((p, c) => `${literal2TS(c.name)}(${p})`, (0, exports.value2TS)(ctx, n.key));
const envVar2Ts = (ctx, n) => n.filters.reduce((p, c) => `${literal2TS(c.name)}(${p})`, `(<string>process.env['${(0, exports.value2TS)(ctx, n.key)}'])`);
const list2TS = (ctx, node) => `[${node.elements.map(n => (0, exports.value2TS)(ctx, n)).join(',')}]`;
const dict2TS = (ctx, node) => (0, exports.flattenCodeStruct)(ctx, structFromDict(ctx, node));
const literal2TS = (n) => (n instanceof ast.StringLiteral) ? `\`${n.value}\`` : n.value;
const structFromDict = (ctx, src) => src.properties.reduce((prev, prop) => {
    let path = paths2TS(prop.path);
    let value = (prop.value instanceof ast.Dict) ?
        structFromDict(ctx, prop.value) :
        (0, exports.value2TS)(ctx, prop.value);
    return (0, path_1.set)(path, value, prev);
}, {});
//# sourceMappingURL=index.js.map