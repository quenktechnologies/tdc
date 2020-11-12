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
exports.newContext = (path, loader) => record_1.merge({ loader, jcon: exports.parse }, {
    path,
    root: path,
    imports: {},
    output: [],
    tendril: '@quenk/tendril',
    EOL: os_1.EOL
});
/**
 * parse jcon source text into an Abstract Syntax Tree (AST).
 *
 * The [[ast.File|File]] node is always the root node of the AST.
 */
exports.parse = (src) => future_1.fromCallback(cb => {
    let eresult = jcon_1.parse(src);
    if (eresult.isLeft()) {
        let msg = eresult.takeLeft().message;
        cb(new Error(`jcon: Error while parsing source text: \n ${msg}`));
    }
    else {
        cb(null, eresult.takeRight());
    }
});
/**
 * compile a parsed file into TypeScript code.
 */
exports.compile = (ctx, file) => future_1.doFuture(function* () {
    let f = yield transform_1.transformTree(ctx, file);
    return future_1.pure(exports.wrapDirectives(ctx, f.directives, exports.file2TS(ctx, f)));
});
const paths2TS = (paths) => paths.map(p => `[${p.value}]`).join('');
/**
 * parseJCONFile at the specified path.
 *
 * A [[ast.File]] node is returned on success.
 */
exports.parseJCONFile = (ctx, path) => ctx
    .loader(path)
    .chain(exports.parse)
    .catch(onParseFileError(path));
const onParseFileError = (path) => (e) => future_1.raise(new Error(`An error occurred while parsing file at ` +
    `"${path}":\n ${e.message}`));
/**
 * flattenCodeStruct converts a Record of Code strings into
 * a single string representing the record in TypeScript output.
 */
exports.flattenCodeStruct = (ctx, rec) => {
    let tokens = record_1.reduce(rec, [], (p, c, k) => {
        let value = type_1.isObject(c) ? exports.flattenCodeStruct(ctx, c) : c;
        return p.concat(`'${k}': ${value}`);
    });
    return `{` + tokens.join(`,${ctx.EOL}`) + '}';
};
/**
 * wrapDirectives in the import preamble and associated export statement.
 *
 * This function makes the generated TypeScript ready for use.
 */
exports.wrapDirectives = (ctx, dirs, code) => [
    imports_1.toCode(exports.getAllImports(dirs), ctx.EOL),
    `import {Template} from ${ctx.tendril}/lib/app/module/template';`,
    ``,
    `export const template: Template<App> =`,
    code
].join(ctx.EOL);
/**
 * getAllImports provides a Record containing all the imports (via module
 * pointer syntax) found in the list of directives provided.
 */
exports.getAllImports = (dirs) => dirs.reduce((p, c) => (c instanceof ast.Property) ?
    addImports(p, c.value) : p, {});
const addImports = (imps, node) => {
    if (node instanceof ast.Member)
        return path_1.set(imports_1.normalize(node.module.module), node.module.module, imps);
    else if (node instanceof ast.List)
        return addImportsInList(imps, node);
    else if (node instanceof ast.Dict)
        return addImportsInDict(imps, node);
    else
        return imps;
};
const addImportsInList = (imps, node) => node.elements.reduce(addImports, imps);
const addImportsInDict = (imps, node) => node.properties.reduce((p, c) => addImports(p, c.value), imps);
/**
 * file2TS converts the body of a parsed file into code.
 *
 * Note: This only outputs the object, not the surronding imports and preamble.
 */
exports.file2TS = (ctx, f) => {
    // Filter out comments.
    let props = f.directives.filter(d => (d instanceof ast.Property));
    return dict2TS(ctx, new ast.Dict(props, {}));
};
/**
 * value2TS transforms one of the valid value nodes into a TypeScript string.
 */
exports.value2TS = (ctx, n) => match_1.match(n)
    .caseOf(ast.Member, n => member2TS(ctx, n))
    .caseOf(ast.Var, n => var2TS(ctx, n))
    .caseOf(ast.EnvVar, n => envVar2Ts(ctx, n))
    .caseOf(ast.List, n => list2TS(ctx, n))
    .caseOf(ast.Dict, n => dict2TS(ctx, n))
    .caseOf(ast.Function, n => n.body)
    .caseOf(ast.StringLiteral, literal2TS)
    .caseOf(ast.NumberLiteral, literal2TS)
    .caseOf(ast.BooleanLiteral, literal2TS)
    .caseOf(ast.Identifier, literal2TS)
    .end();
const member2TS = (ctx, m) => `${imports_1.normalize(m.module.module)}.` +
    (m.invocation ?
        `${exports.value2TS(ctx, m.member)}` +
            `(${m.parameters.map(p => exports.value2TS(ctx, p)).join(',')})` :
        exports.value2TS(ctx, m.member));
const var2TS = (ctx, n) => n.filters.reduce((p, c) => `${literal2TS(c.name)}(${p})`, exports.value2TS(ctx, n.key));
const envVar2Ts = (ctx, n) => n.filters.reduce((p, c) => `${literal2TS(c.name)}(${p})`, `(<string>process.env['${exports.value2TS(ctx, n.key)}'])`);
const list2TS = (ctx, node) => `[${node.elements.map(n => exports.value2TS(ctx, n)).join(',')}]`;
const dict2TS = (ctx, node) => exports.flattenCodeStruct(ctx, structFromDict(ctx, node));
const literal2TS = (n) => (n instanceof ast.StringLiteral) ? `\`${n.value}\`` : n.value;
const structFromDict = (ctx, src) => src.properties.reduce((prev, prop) => {
    let path = paths2TS(prop.path);
    let value = (prop.value instanceof ast.Dict) ?
        structFromDict(ctx, prop.value) :
        exports.value2TS(ctx, prop.value);
    return path_1.set(path, value, prev);
}, {});
//# sourceMappingURL=index.js.map