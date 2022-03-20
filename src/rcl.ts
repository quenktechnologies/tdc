import * as ast from '@quenk/rcl/lib/ast';

import { EOL } from 'os';

import { merge } from '@quenk/noni/lib/data/record';
import { set } from '@quenk/noni/lib/data/record/path';
import { match } from '@quenk/noni/lib/control/match';
import { flatten, tail, contains } from '@quenk/noni/lib/data/array';
import {
    Future,
    parallel,
    pure,
    fromCallback,
    doFuture
} from '@quenk/noni/lib/control/monad/future';
import { tree, parse as _parse } from '@quenk/rcl';

import { Code } from './common/output';
import { Imports, normalize } from './common/imports';

/**
 * Loader loads the parsed contents of a RCL file
 * into memory.
 */
export type Loader = (path: string) => Future<string>;

/**
 * Parser turns a text string into a File node.
 */
export type Parser = (src: string) => Future<ast.File>;

/**
 * Context compilation takes place in.
 */
export interface Context {

    /**
     * locals is a list of variable names found in the compiled source.
     */
    locals: string[],

    /**
     * loader configured
     */
    loader: Loader

    /**
     * rcl parser configured for the Context.
     */
    rcl: Parser

}

/**
 * newContext constructor function.
 */
export const newContext = (loader: Loader): Context =>
    merge({ loader, rcl: parse, locals: [] }, {});

/**
 * parse source text into an rcl File node.
 */
export const parse = (src: string): Future<ast.File> =>
    fromCallback(cb => {

        let eresult = _parse(src, tree);

        if (eresult.isLeft()) {
            let msg = eresult.takeLeft().message;
            cb(new Error(`rcl: Error while parsing source text: \n ${msg}`));

        } else {

            cb(null, <ast.File>eresult.takeRight());

        }

    });

/**
 * compile some source text into Code code.
 */
export const compile = (src: string, ctx: Context): Future<Code> =>
    parse(src).chain(f => file2TS(ctx, f));

/**
 * getAllImports provides an Imports object containing all the imports found
 * in a file based on detected module pointer syntax usage.
 */
export const getAllImports = (file: ast.File): Imports =>
    file.body.reduce((imps, node: ast.Node) => {

        if (node instanceof ast.Set)
            return takeImports(imps, node.value);

        else if (node instanceof ast.Route)
            return node.filters.reduce(takeImports, imps);

        else
            return imps;

    }, <Imports>{});

const takeImports = (imps: Imports, node: ast.Expression): Imports => {

    if (node instanceof ast.ModuleMember) {

        let { module } = node;
        return set(normalize(module), module, imps);

    } else if (node instanceof ast.FunctionCall) {

        return takeImportsFromFuncCall(imps, node);

    } else if (node instanceof ast.List) {

        return takeImportsFromList(imps, node);

    } else if (node instanceof ast.Dict) {

        return takeImportsFromDict(imps, node);

    } else {

        return imps;

    }

}

const takeImportsFromList = (imps: Imports, node: ast.List) =>
    node.elements.reduce(takeImports, imps);

const takeImportsFromDict = (imps: Imports, node: ast.Dict) =>
    node.properties.reduce((p, c) => takeImports(p, c.value), imps);

const takeImportsFromFuncCall = (imps: Imports, node: ast.FunctionCall) =>
    node.args.reduce(takeImports, takeImports(imps, node.id));

/**
 * file2TS transforms a file into a function for installing 
 * routes.
 *
 * This writes only the function and not imports.
 */
export const file2TS = (ctx: Context, node: ast.File): Future<Code> =>
    doFuture(function*() {

        let file = yield resolveIncludes(ctx, node)

        let nodes = file.body.filter((n: ast.Node) =>
            !(n instanceof ast.Comment));

        let code = [`//@ts-ignore: 6133`, EOL, `($module:Module) => {${EOL}${EOL}`];

        code.push('let $routes:$RouteConf[] = [];', EOL);

        nodes.forEach((bodyNode: ast.Node) => {

            if (bodyNode instanceof ast.Set) {

                code.push(set2TS(ctx, bodyNode));
                code.push(EOL);

            } else if (bodyNode instanceof ast.Route) {

                code.push(EOL);
                code.push('$routes.push(');
                code.push(route2TS(bodyNode));
                code.push(');');
                code.push(EOL);

            }

        });

        code.push('return $routes;');
        code.push(EOL);
        code.push('}');

        return pure(code.join(''));

    });

/**
 * resolveIncludes found in a File node.
 *
 * This merges the contents of each [[ast.Include]] found into the passed
 * [[ast.File]].
 */
export const resolveIncludes =
    (ctx: Context, node: ast.File): Future<ast.File> =>
        doFuture<ast.File>(function*() {

            let work = parallel(node.body.map(n => doFuture(function*() {

                if (n instanceof ast.Include) {

                    let txt = yield ctx.loader(n.path.value);
                    let _file = yield ctx.rcl(txt);
                    let file = yield resolveIncludes(ctx, _file);
                    return pure(file.body);

                } else {

                    return pure(n);

                }

            })));

            node.body = flatten(yield work);

            return pure(node);

        });

const set2TS = (ctx: Context, node: ast.Set): Code => {

    let id = node.id.value;
    let assignment = `${id} = ${value2TS(node.value)};`;

    if (!contains(ctx.locals, id)) {

        ctx.locals.push(id);
        return `let ${assignment}`;

    } else {

        return assignment;

    }

}

const route2TS = (node: ast.Route): Code => {

    let code = [];

    code.push('{', EOL);
    code.push('method:', `'${node.method.toLowerCase()}'`, ',', EOL);
    code.push('path:', `'${node.pattern.value}'`, ',', EOL);
    code.push('filters:');
    code.push('[');

    let filters = node.filters.map(f => {

        let out = filter2TS(f);

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
        }`

        } else {

            return out;

        }

    }).join(',');

    code.push(filters);


    if (node.view)
        code.push(view2TS(node.view));

    code.push('],');

    let tags = node.tags.map(tag =>
        `${value2TS(tag.name)}: ${value2TS(tag.value)} `);

    code.push('{', tags.join(`,${EOL}`), '}')

    code.push('}');

    return code.join('');

}

const view2TS = (view?: ast.View) => (view) ?
    `$module.show(${literal2TS(view.view)}, ` +
    `${dict2TS(<ast.Dict>view.context)})` :
    '';

const value2TS = (node: ast.Expression): Code => <Code>match(node)
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

const filter2TS = (filter: ast.Filter): Code => {

    if (filter instanceof ast.QualifiedIdentifier) {

        // These should be method/function calls and should be bound.

        let method = value2TS(filter);
        let path = method.split('.');
        let target = path.slice(0, path.length - 1).join('.');

        return `${method}.bind(${target})`;

    } else {

        return value2TS(filter);

    }

}

const functionCall2TS = ({ id, args }: ast.FunctionCall): Code => {

    let isMember = (id instanceof ast.ModuleMember);

    let path = isMember ?
        modueMember2TS(<ast.ModuleMember>id) :
        anyIdentifier2TS(<ast.AnyIdentifier>id);

    let parts = path.split('.');

    let argsStr = args.map(value2TS).join(',');

    if ((!isMember && parts.length > 1) || (isMember && parts.length > 2)) {

        let target = parts.slice(0, parts.length - 1).join('.');

        let isConstructor = tail(parts) === tail(parts).toUpperCase();

        return isConstructor ? `new ${path}(${argsStr})` :
            `${path}.call(${target}, [${argsStr}])`;

    } else {

        let isConstructor = tail(parts)[0] === tail(parts)[0].toUpperCase();

        return isConstructor ? `new ${path}(${argsStr})` : `${path}(${argsStr})`;

    }

}

const modueMember2TS = ({ module, member }: ast.ModuleMember) =>
    `${normalize(module)}.${member.value}`;

const list2TS = ({ elements }: ast.List): Code =>
    `[${elements.map(value2TS).join(',')}]`;

const dict2TS = ({ properties }: ast.Dict): Code =>
    `{` +

    properties.map(p =>
        `${value2TS(p.key)}: ${value2TS(p.value)} `).join('\n') +

    '}';

const literal2TS = (node: ast.Literal): Code =>
    (node instanceof ast.StringLiteral) ? `\`${node.value}\`` : node.value;

const envVar2TS = (node: ast.EnvVar): Code =>
    `process.env['${value2TS(node.key)}']`;

const anyIdentifier2TS = (i: ast.AnyIdentifier): Code => <Code>match(i)
    .caseOf(ast.Identifier, identifier2TS)
    .caseOf(ast.QualifiedIdentifier, qualifiedIdentifier2TS)
    .end();

const qualifiedIdentifier2TS = (node: ast.QualifiedIdentifier) =>
    node.path.map(identifier2TS).join('.');

const identifier2TS = (node: ast.Identifier) => node.value;
