import * as ast from '@quenk/jcon/lib/ast';
import { EOL } from 'os';
import { set } from 'property-seek';
import {
    Future,
    raise,
    pure,
    parallel
} from '@quenk/noni/lib/control/monad/future';
import { merge, reduce } from '@quenk/noni/lib/data/record';
import { tail } from '@quenk/noni/lib/data/array';
import { camelCase, uncapitalize } from '@quenk/noni/lib/data/string';
import { Path } from '@quenk/noni/lib/io/file';
import { match } from '@quenk/noni/lib/control/match';
import { parse as _parse, tree } from '@quenk/jcon';

/**
 * Text source.
 */
export type Text = string;

/**
 * TypeScript output.
 */
export type TypeScript = string;

/**
 * Loader loads the parsed contents of a JCON file
 * into memory.
 */
export type Loader = (path: string) => Future<string>;

/**
 * Parser turns a text string into a File node.
 */
export type Parser = (src: Text) => Future<ast.File>;

/**
 * CandidateTypeScriptT
 */
export type CandidateTypeScript = TypeScript | CandidateTypeScripts;

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
     * jcon parser configured for the Context.
     */
    jcon: Parser,

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
 * PotentialOutput 
 */
export interface CandidateTypeScripts {

    [key: string]: CandidateTypeScript;

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
 * file2TS transforms a File node into TypeScript.
 */
export const file2TS = (ctx: Context, f: ast.File): Future<TypeScript> =>
    (loadFileRec(ctx)(f)).map(compileDs(ctx));

const loadFileRec = (ctx: Context) => (f: ast.File): Future<ast.File> =>
    parallel(f.includes.map(p => loadFile(ctx, p.path.value))).map(mergeDs(f));

const loadFile = (ctx: Context, path: Path): Future<ast.File> =>
    ctx
        .loader(path)
        .chain(ctx.jcon)
        .chain(loadFileRec(ctx));

const mergeDs = (f: ast.File) => (list: ast.File[]): ast.File =>
    list.reduce((p: ast.File, c: ast.File) => {
        p.directives = [...c.directives, ...p.directives];
        return p;
    }, f);

const compileDs = (ctx: Context) => (f: ast.File) =>
    candidate2TS(ctx,
        f
            .directives
            .reduce(makePotentials, {}));

const candidate2TS = (ctx: Context, st: CandidateTypeScript)
    : TypeScript => (typeof st === 'string') ?
        st :
        '{' + reduce(st, [], (p, c, k) =>
            p.concat(`'${k}': ${candidate2TS(ctx, c)}`))
            .join(`,${ctx.EOL}`)
            .concat('}');

const makePotentials = (p: CandidateTypeScripts, c: ast.Directive)
    : CandidateTypeScripts => (c instanceof ast.Property) ?
        set(c.path.map(i => i.value).join('.'), value2TS(c.value), p) :
        p;

/**
 * value2TS transforms one of the Value nodes into its TypeScript 
 * equivelant.
 */
export const value2TS = (n: ast.Value): string => <string>match(n)
    .caseOf(ast.Member, member2TS)
    .caseOf(ast.Var, var2Ts)
    .caseOf(ast.EnvVar, envVar2Ts)
    .caseOf(ast.List, list2TS)
    .caseOf(ast.Dict, dict2TS)
    .caseOf(ast.StringLiteral, literal2TS)
    .caseOf(ast.NumberLiteral, literal2TS)
    .caseOf(ast.BooleanLiteral, literal2TS)
    .caseOf(ast.Identifier, literal2TS)
    .caseOf(ast.ArrowFunction, arrowFunction2TS)
    .end();

const member2TS = (m: ast.Member) =>
    `${normalizeId(tail(m.module.module.split('/')))}.` +
    (m.invocation ?
        `${value2TS(m.member)}(${m.parameters.map(value2TS).join(',')})` :
        value2TS(m.member));

const var2Ts = (n: ast.Var) =>
    `${value2TS(n.key)}`;

const envVar2Ts = (n: ast.EnvVar) =>
    `(<string>process.env['${value2TS(n.key)}'])`;

const list2TS = (l: ast.List) =>
    `[${l.elements.map(value2TS).join(',')}]`;

const dict2TS = (d: ast.Dict) => {

    let props = d.properties.map(p => `${value2TS(p.key)}: ${value2TS(p.value)}`);
    return `{ ${props.join(',\n')} }`;

}

const literal2TS = (n: ast.Literal) =>
    (n instanceof ast.StringLiteral) ? `\`${n.value}\`` : n.value;

const arrowFunction2TS = (n: ast.ArrowFunction) =>
    n.body;

const wrapOutput = (ctx: Context, f: ast.File) => (ts: TypeScript) => {

    let i = file2Imports(ctx, f);
    return pure(`${i}${ctx.EOL}import {Template} from ` +
        `'${ctx.tendril}/lib/app/module/template';` +
        `${ctx.EOL}${ctx.EOL} ` +
        `export const template: Template<App> = ${ctx.EOL} ${ts}`);

}

/**
 * file2Imports extracts a list of TypeScript imports from a File node.
 */
export const file2Imports = (ctx: Context, f: ast.File): TypeScript =>
    flattenImports(ctx, f
        .directives
        .reduce((p, c) => (c instanceof ast.Property) ?
            value2Imports(ctx, p, c.value) :
            p, {}));

const value2Imports = (ctx: Context, p: Imports, c: ast.Value): Imports =>
    <Imports>match(c)
        .caseOf(ast.Member, member2Import(p))
        .caseOf(ast.List, list2Import(ctx, p))
        .caseOf(ast.Dict, dict2Import(ctx, p))
        .orElse(() => p)
        .end();

const member2Import = (p: Imports) => (m: ast.Member) =>
    set(normalizeId(tail(m.module.module.split('/'))), m.module.module, p);

const list2Import = (ctx: Context, p: Imports) => (l: ast.List) =>
    l.elements.reduce((p, c) => value2Imports(ctx, p, c), p);

const dict2Import = (ctx: Context, i: Imports) => (d: ast.Dict) =>
    d.properties.reduce((p, c) => value2Imports(ctx, p, c.value), i);

const normalizeId = (str: string): string =>
    uncapitalize(camelCase(str));

const flattenImports = (ctx: Context, i: Imports): TypeScript =>
    reduce(i, [], (p, c, k) =>
        [...p, `import * as ${k} from '${c}'; `]).join(ctx.EOL);

/**
 * parse source text into a File node.
 */
export const parse = (src: Text): Future<ast.File> =>
    _parse(src, tree)
        .map(n => (n instanceof ast.File) ? pure(n) : raise(notFile(n)))
        .orRight(raise)
        .map((f: Future<ast.File>) => f)
        .takeRight();

const notFile = (n: ast.Node) =>
    new Error(`Expected a valid file got "${n.type}"!`);

/**
 * compile some source text into TypeScript code.
 */
export const compile = (src: string, ctx: Context): Future<TypeScript> =>
    parse(src).chain(f =>
        file2TS(ctx, f).chain(wrapOutput(ctx, f)));

