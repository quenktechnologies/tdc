import * as ast from '@quenk/jcon/lib/ast';

import { EOL } from 'os';

import {
    Future,
    raise,
    pure,
    sequential,
    doFuture
} from '@quenk/noni/lib/control/monad/future';
import { merge, reduce } from '@quenk/noni/lib/data/record';
import { set } from '@quenk/noni/lib/data/record/path';
import { tail } from '@quenk/noni/lib/data/array';
import { camelCase, uncapitalize } from '@quenk/noni/lib/data/string';
import { isObject } from '@quenk/noni/lib/data/type';
import { Path } from '@quenk/noni/lib/io/file';
import { match } from '@quenk/noni/lib/control/match';
import { parse as _parse } from '@quenk/jcon';

/**
 * SourceText source.
 */
export type SourceText = string;

/**
 * Code output.
 */
export type Code = string;

/**
 * Loader loads the parsed contents of a JCON file
 * into memory.
 */
export type Loader = (path: string) => Future<string>;

/**
 * Context the jcon file is complied in.
 */
export interface Context {

    /**
     * loader configured for the Context.
     *
     * All paths are passed as encountered.
     */
    loader: Loader,

    /**
     * tendril import module path.
     */
    tendril: string,

    /**
     * EOL marker to use during compilation.
     */
    EOL: string

}

/**
 * Imports map.
 */
export interface Imports {

    [key: string]: string

}

/**
 * CodeStruct holds the Code for the final output of compilation in a structure
 * that preserves the nesting of the properties.
 */
export interface CodeStruct {

    [key: string]: Code | CodeStruct

}

/**
 * newContext constructor function.
 */
export const newContext =
    (loader: Loader, ): Context =>
        merge({ loader, jcon: parse }, {
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
export const parse = (src: SourceText): Future<ast.File> => {

    let mfile = _parse(src);

    if (mfile.isLeft())
        return onParseError(mfile.takeLeft());

    return pure(<ast.File>mfile.takeRight());

}

const onParseError = (e: Error): Future<ast.File> => raise(
    new Error(`An error occurred while parsing file the provided source ` +
        `text: \n ${e.message}`));

/**
 * compile some an AST into the TypeScript code.
 */
export const compile = (ctx: Context, file: ast.File): Future<Code> =>
    doFuture<Code>(function*() {

        let dirs: ast.Directive[] = yield getAllDirectives(ctx, file);

        // Filter out comments.
        let props = <ast.Property[]>dirs.filter(d =>
            (d instanceof ast.Property));

        let code = dict2TS(ctx, new ast.Dict(props, {}));

        return pure(wrapDirectives(ctx, dirs, code));

    });

const paths2TS = (paths: (ast.Identifier | ast.StringLiteral)[]) =>
    paths.map(p => `[${p.value}]`).join('');
/**
 * getAllDirectives provides the directives of a File (and all included files).
 */
export const getAllDirectives =
    (ctx: Context, f: ast.File): Future<ast.Directive[]> =>
        doFuture(function*() {

            let work = f.includes.map(i => doFuture(function*() {

                let { path } = i;

                let file = yield parseJCONFile(ctx, path.value);

                let childDirectives = yield getAllDirectives(ctx, file);

                return pure([...childDirectives, ...file.directives]);

            }));

            let results: ast.Directive[][] = yield sequential(work);

            let flatResults =
                results.reduce((p, c) => p.concat(c), <ast.Directive[]>[]);

            return pure([...flatResults, ...f.directives]);

        });

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

        let tokens = reduce(rec, [], (p, c, k) => {

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
            flattenImports(ctx, getAllImports(dirs)),
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
    dirs.reduce((p, c) => {

        if (c instanceof ast.Property) {

            let { value } = c;

            if (value instanceof ast.Member)
                return addImports(p, value);
            else if (value instanceof ast.List)
                return addImportsInList(p, value);
            else if (value instanceof ast.Dict)
                return addImportsInDict(p, value);

        }

        return p;

    }, <Imports>{});


const addImports = (rec: Imports, m: ast.Member) =>
    set(normalizeId(tail(m.module.module.split('/'))), m.module.module, rec);

const addImportsInList = (rec: Imports, l: ast.List) =>
    l.elements.reduce((p, c) => (c instanceof ast.Member) ?
        addImports(p, c) : rec, rec);

const addImportsInDict = (rec: Imports, d: ast.Dict) =>
    d.properties.reduce((rec, c) => (c.value instanceof ast.Member) ?
        addImports(rec, c.value) : rec, rec);

const normalizeId = (str: string): string =>
    uncapitalize(camelCase(str));

/**
 * flattenImports into a TypeScript string.
 */
export const flattenImports = (ctx: Context, i: Imports): Code =>
    reduce(i, [], (p, c, k) =>
        [...p, `import * as ${k} from '${c}'; `]).join(ctx.EOL);

/**
 * value2TS transforms one of the valid value nodes into a TypeScript string.
 */
export const value2TS = (ctx: Context, n: ast.Value): Code => <Code>match(n)
    .caseOf(ast.Member, n => member2TS(ctx, n))
    .caseOf(ast.Var, n => var2TS(ctx, n))
    .caseOf(ast.EnvVar, n => envVar2Ts(ctx, n))
    .caseOf(ast.List, n => list2TS(ctx, n))
    .caseOf(ast.Dict, n => dict2TS(ctx, n))
    .caseOf(ast.StringLiteral, literal2TS)
    .caseOf(ast.NumberLiteral, literal2TS)
    .caseOf(ast.BooleanLiteral, literal2TS)
    .caseOf(ast.Identifier, literal2TS)
    .end();

const member2TS = (ctx: Context, m: ast.Member) =>
    `${normalizeId(tail(m.module.module.split('/')))}.` +
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

const list2TS = (ctx: Context, l: ast.List) =>
    `[${l.elements.map(n => value2TS(ctx, n)).join(',')}]`;

const dict2TS = (ctx: Context, d: ast.Dict) =>
    flattenCodeStruct(ctx, structFromDict(ctx, d));

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
