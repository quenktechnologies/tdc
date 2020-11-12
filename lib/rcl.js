"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIncludes = exports.file2TS = exports.getAllImports = exports.compile = exports.parse = exports.newContext = void 0;
const ast = require("@quenk/rcl/lib/ast");
const os_1 = require("os");
const record_1 = require("@quenk/noni/lib/data/record");
const path_1 = require("@quenk/noni/lib/data/record/path");
const match_1 = require("@quenk/noni/lib/control/match");
const array_1 = require("@quenk/noni/lib/data/array");
const future_1 = require("@quenk/noni/lib/control/monad/future");
const rcl_1 = require("@quenk/rcl");
const imports_1 = require("./common/imports");
/**
 * newContext constructor function.
 */
exports.newContext = (loader) => record_1.merge({ loader, rcl: exports.parse, locals: [] }, {});
/**
 * parse source text into an rcl File node.
 */
exports.parse = (src) => future_1.fromCallback(cb => {
    let eresult = rcl_1.parse(src, rcl_1.tree);
    if (eresult.isLeft()) {
        let msg = eresult.takeLeft().message;
        cb(new Error(`rcl: Error while parsing source text: \n ${msg}`));
    }
    else {
        cb(null, eresult.takeRight());
    }
});
/**
 * compile some source text into Code code.
 */
exports.compile = (src, ctx) => exports.parse(src).chain(f => exports.file2TS(ctx, f));
/**
 * getAllImports provides an Imports object containing all the imports found
 * in a file based on detected module pointer syntax usage.
 */
exports.getAllImports = (file) => file.body.reduce((imps, node) => {
    if (node instanceof ast.Set)
        return takeImports(imps, node.value);
    else if (node instanceof ast.Route)
        return node.filters.reduce(takeImports, imps);
    else
        return imps;
}, {});
const takeImports = (imps, node) => {
    if (node instanceof ast.ModuleMember) {
        let { module } = node;
        return path_1.set(imports_1.normalize(module), module, imps);
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
const takeImportsFromList = (imps, node) => node.elements.reduce(takeImports, imps);
const takeImportsFromDict = (imps, node) => node.properties.reduce((p, c) => takeImports(p, c.value), imps);
const takeImportsFromFuncCall = (imps, node) => node.args.reduce(takeImports, takeImports(imps, node.id));
/**
 * file2TS transforms a file into a function for installing
 * routes.
 *
 * This writes only the function and not imports.
 */
exports.file2TS = (ctx, node) => future_1.doFuture(function* () {
    let file = yield exports.resolveIncludes(ctx, node);
    let nodes = file.body.filter((n) => !(n instanceof ast.Comment));
    let code = [`($module:Module) => {${os_1.EOL}${os_1.EOL}`];
    code.push('let $routes = [];', os_1.EOL);
    nodes.forEach((bodyNode) => {
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
    return future_1.pure(code.join(''));
});
/**
 * resolveIncludes found in a File node.
 *
 * This merges the contents of each [[ast.Include]] found into the passed
 * [[ast.File]].
 */
exports.resolveIncludes = (ctx, node) => future_1.doFuture(function* () {
    let work = future_1.parallel(node.body.map(n => future_1.doFuture(function* () {
        if (n instanceof ast.Include) {
            let txt = yield ctx.loader(n.path.value);
            let _file = yield ctx.rcl(txt);
            let file = yield exports.resolveIncludes(ctx, _file);
            return future_1.pure(file.body);
        }
        else {
            return future_1.pure(n);
        }
    })));
    node.body = array_1.flatten(yield work);
    return future_1.pure(node);
});
const set2TS = (ctx, node) => {
    let id = node.id.value;
    let assignment = `${id} = ${value2TS(node.value)};`;
    if (!array_1.contains(ctx.locals, id)) {
        ctx.locals.push(id);
        return `let ${assignment}`;
    }
    else {
        return assignment;
    }
};
const route2TS = (node) => {
    let code = [];
    code.push('{', os_1.EOL);
    code.push('method:', `'${node.method.toLowerCase()}'`, ',', os_1.EOL);
    code.push('path:', `'${node.pattern.value}'`, ',', os_1.EOL);
    code.push('filters:');
    code.push('[');
    let filters = node.filters.map(f => {
        let out = value2TS(f);
        if (f instanceof ast.FunctionCall) {
            return `// @ts-ignore: 6133
                ($request: Request)=> {

                  // @ts-ignore: 6133
                 let $params:_json.Object = $request.params || {};
                 // @ts-ignore: 6133
                 let $query: _json.Object = $request.query || {};
                 //@ts-ignore: 6133
                 let $body = _json.Value = $request.body;

                 return ${out};
        }`;
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
const view2TS = (view) => (view) ?
    `$module.show(${literal2TS(view.view)}, ` +
        `${dict2TS(view.context)})` :
    '';
const value2TS = (node) => match_1.match(node)
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
    .end();
const functionCall2TS = ({ id, args }) => {
    let name = (id instanceof ast.ModuleMember) ?
        modueMember2TS(id) : anyIdentifier2TS(id);
    let argsStr = args.map(value2TS).join(',');
    let ret = `${name}(${argsStr})`;
    let target = array_1.tail(name.split('.'));
    let isConstructor = target[0] === target[0].toUpperCase();
    return isConstructor ? `new ${ret}` : ret;
};
const modueMember2TS = ({ module, member }) => `${imports_1.normalize(module)}.${member.value}`;
const list2TS = ({ elements }) => `[${elements.map(value2TS).join(',')}]`;
const dict2TS = ({ properties }) => `{` +
    properties.map(p => `${value2TS(p.key)}: ${value2TS(p.value)} `).join('\n') +
    '}';
const literal2TS = (node) => (node instanceof ast.StringLiteral) ? `\`${node.value}\`` : node.value;
const envVar2TS = (node) => `process.env['${value2TS(node.key)}']`;
const anyIdentifier2TS = (i) => match_1.match(i)
    .caseOf(ast.Identifier, identifier2TS)
    .caseOf(ast.QualifiedIdentifier, qualifiedIdentifier2TS)
    .end();
const qualifiedIdentifier2TS = (node) => node.path.map(identifier2TS).join('.');
const identifier2TS = (node) => node.value;
//# sourceMappingURL=rcl.js.map