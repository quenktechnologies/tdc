import * as ast from '@quenk/jcon/lib/ast';

import { EOL } from 'os';

import {
    Future,
    raise,
    pure,
    doFuture,
    fromCallback
} from '@quenk/noni/lib/control/monad/future';
import { merge, reduce } from '@quenk/noni/lib/data/record';
import { set } from '@quenk/noni/lib/data/record/path';
import { isObject } from '@quenk/noni/lib/data/type';
import { Path } from '@quenk/noni/lib/io/file';
import { match } from '@quenk/noni/lib/control/match';
import { parse as _parse } from '@quenk/jcon';

import { SourceString, Code } from '../common/output';
import { Imports, normalize, toCode } from '../common/imports';
import { Context, Loader } from './context';
import { transformTree } from './transform';

/**
 * CodeStruct holds the Code for the final output of compilation in a structure
 * that preserves the nesting of the properties.
 */
export interface CodeStruct {

    [key: string]: Code | CodeStruct

}

/**
 * newContext creates a new compilation context.
 */
export const newContext =
    (path: Path, loader: Loader): Context =>
        merge({ loader, jcon: parse }, {
            path,
            root: path,
            imports: {},
            output: [],
            tendril: '@quenk/tendril',
            EOL
        });

/**
 * parse jcon source text into an Abstract Syntax Tree (AST).
 *
 * The [[ast.File|File]] node is always the root node of the AST.
 */
export const parse = (src: SourceString): Future<ast.File> =>
    fromCallback(cb => {

        let eresult = _parse(src);

        if (eresult.isLeft()) {
            let msg = eresult.takeLeft().message;
            cb(new Error(`jcon: Error while parsing source text: \n ${msg}`));

        } else {

            cb(null, <ast.File>eresult.takeRight());

        }

    });

/**
 * compile a parsed file into TypeScript code.
 */
export const compile = (ctx: Context, file: ast.File): Future<Code> =>
    doFuture<Code>(function*() {

        let f = yield transformTree(ctx, file);
        return pure(wrapDirectives(ctx, f.directives, file2TS(ctx, f)));

    });

const paths2TS = (paths: (ast.Identifier | ast.StringLiteral)[]) =>
    paths.map(p => `[${p.value}]`).join('');

/**
 * parseJCONFile at the specified path.
 *
 * A [[ast.File]] node is returned on success.
 */
export const parseJCONFile = (ctx: Context, path: Path): Future<ast.File> =>
    ctx
        .loader(path)
        .chain(parse)
        .catch(onParseFileError(path));

const onParseFileError = (path: Path) => (e: Error): Future<ast.File> => raise(
    new Error(`An error occurred while parsing file at ` +
        `"${path}":\n ${e.message}`));
/**
 * flattenCodeStruct converts a Record of Code strings into
 * a single string representing the record in TypeScript output.
 */
export const flattenCodeStruct =
    (ctx: Context, rec: CodeStruct): Code => {

        let tokens = reduce(rec, [], (p: string[], c, k) => {

            let value = isObject(c) ? flattenCodeStruct(ctx, c) : c;

            return p.concat(`'${k}': ${value}`);

        });

        return `{` + tokens.join(`,${ctx.EOL}`) + '}';

    }

/**
 * wrapDirectives in the import preamble and associated export statement.
 *
 * This function makes the generated TypeScript ready for use.
 */
export const wrapDirectives =
    (ctx: Context, dirs: ast.Directive[], code: Code): Code =>
        [
            toCode(getAllImports(dirs), ctx.EOL),
            `import {Template} from ${ctx.tendril}/lib/app/module/template';`,
            ``,
            `export const template: Template<App> =`,
            code
        ].join(ctx.EOL);

/**
 * getAllImports provides a Record containing all the imports (via module 
 * pointer syntax) found in the list of directives provided.
 */
export const getAllImports = (dirs: ast.Directive[]): Imports =>
    dirs.reduce((p, c) => (c instanceof ast.Property) ?
        addImports(p, c.value) : p, <Imports>{});

const addImports = (imps: Imports, node: ast.Value): Imports => {

    if (node instanceof ast.Member)
        return set(normalize(node.module.module), node.module.module, imps);

    else if (node instanceof ast.List)
        return addImportsInList(imps, node);

    else if (node instanceof ast.Dict)
        return addImportsInDict(imps, node);

    else
        return imps;

}

const addImportsInList = (imps: Imports, node: ast.List) =>
    node.elements.reduce(addImports, imps);

const addImportsInDict = (imps: Imports, node: ast.Dict) =>
    node.properties.reduce((p, c) => addImports(p, c.value), imps);

/**
 * file2TS converts the body of a parsed file into code.
 *
 * Note: This only outputs the object, not the surronding imports and preamble.
 */
export const file2TS = (ctx: Context, f: ast.File): Code => {

    // Filter out comments.
    let props = <ast.Property[]>f.directives.filter(d =>
        (d instanceof ast.Property));

    return dict2TS(ctx, new ast.Dict(props, {}));

}

/**
 * value2TS transforms one of the valid value nodes into a TypeScript string.
 */
export const value2TS = (ctx: Context, n: ast.Value): Code => <Code>match(n)
    .caseOf(ast.Member, (n:ast.Member) => member2TS(ctx, n))
    .caseOf(ast.Var, (n:ast.Var) => var2TS(ctx, n))
    .caseOf(ast.EnvVar, (n:ast.EnvVar) => envVar2Ts(ctx, n))
    .caseOf(ast.List, (n:ast.List) => list2TS(ctx, n))
    .caseOf(ast.Dict, (n: ast.Dict) => dict2TS(ctx, n))
    .caseOf(ast.Function, (n:ast.Function) => n.body)
    .caseOf(ast.StringLiteral, literal2TS)
    .caseOf(ast.NumberLiteral, literal2TS)
    .caseOf(ast.BooleanLiteral, literal2TS)
    .caseOf(ast.Identifier, literal2TS)
    .end();

const member2TS = (ctx: Context, m: ast.Member) =>
    `${normalize(m.module.module)}.` +
    (m.invocation ?
        `${value2TS(ctx, m.member)}` +
        `(${m.parameters.map(p => value2TS(ctx, p)).join(',')})` :
        value2TS(ctx, m.member));

const var2TS = (ctx: Context, n: ast.Var) =>
    n.filters.reduce((p, c) =>
        `${literal2TS(c.name)}(${p})`, value2TS(ctx, n.key));

const envVar2Ts = (ctx: Context, n: ast.EnvVar) =>
    n.filters.reduce((p, c) => `${literal2TS(c.name)}(${p})`,
        `(<string>process.env['${value2TS(ctx, n.key)}'])`);

const list2TS = (ctx: Context, node: ast.List) =>
    `[${node.elements.map(n => value2TS(ctx, n)).join(',')}]`;

const dict2TS = (ctx: Context, node: ast.Dict) =>
    flattenCodeStruct(ctx, structFromDict(ctx, node));

const literal2TS = (n: ast.Literal) =>
    (n instanceof ast.StringLiteral) ? `\`${n.value}\`` : n.value;

const structFromDict =
    (ctx: Context, src: ast.Dict): CodeStruct =>
        src.properties.reduce((prev, prop) => {

            let path = paths2TS(prop.path);

            let value = (prop.value instanceof ast.Dict) ?
                structFromDict(ctx, prop.value) :
                value2TS(ctx, prop.value);

            return set(path, value, <{ [key: string]: string }>prev);

        }, <CodeStruct>{});
