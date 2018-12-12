import * as ast from '@quenk/rcl/lib/ast';
import { EOL } from 'os';
import { merge, reduce } from '@quenk/noni/lib/data/record';
import { match } from '@quenk/noni/lib/control/match';
import {
    Future,
    parallel,
    pure,
    raise
} from '@quenk/noni/lib/control/monad/future';
import { Path } from '@quenk/noni/lib/io/file';
import { tree, parse as _parse } from '@quenk/rcl';

/**
 * TypeScript output.
 */
export type TypeScript = string;

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
 * Imports map.
 */
export interface Imports {

    [key: string]: string | string[]
}

/**
 * Context compilation takes place in.
 */
export interface Context {

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
export const newContext =
    (loader: Loader): Context =>
        merge({ loader, rcl: parse }, {
            EOL
        });

/**
 * file2Imports extracts the imports for a File
 */
export const file2Imports = (f: ast.File): Imports =>
    f.imports.reduce(addImport, {});

const addImport = (p: Imports, c: ast.Import): Imports => <Imports>match(c)
    .caseOf(ast.MemberImport, addMemberImport(p))
    .caseOf(ast.QualifiedImport, addQualifiedImport(p))
    .end();

const addMemberImport = (p: Imports) => ({ members, module }: ast.MemberImport) =>
    merge(p, { [module.value]: members.map(m => m.value) });

const addQualifiedImport = (p: Imports) => ({ module, id }: ast.QualifiedImport) =>
    merge(p, { [module.value]: id });

/**
 * imports2TS converts a map of imports to 
 * the relevant TypeScript import blocks.
 */
export const imports2TS = (i: Imports): TypeScript =>
    reduce(i, [], (p: TypeScript[], c, k) =>
        Array.isArray(c) ?
            [...p, `import { ${c.join(',')} } from '${k}';`] :
            [...p, `import * as ${c} from '${k}';`]).join(EOL);

/**
 * file2TS transforms a file into a function for installing 
 * routes.
 *
 * This writes only the function and not imports.
 */
export const file2TS = (ctx: Context, f: ast.File): Future<TypeScript> =>
    (loadFileRec(ctx)(f))
        .map(fileRoutes2TS)
        .map(wrapInFunc);

const loadFileRec = (ctx: Context) => (f: ast.File): Future<ast.File> =>
    parallel(f.includes.map(p => loadFile(ctx, p.path.value))).map(mergeRs(f));

const loadFile = (ctx: Context, path: Path): Future<ast.File> =>
    ctx
        .loader(path)
        .chain(ctx.rcl)
        .chain(loadFileRec(ctx));

const mergeRs = (f: ast.File) => (list: ast.File[]): ast.File =>
    list.reduce((p: ast.File, c: ast.File) => {
        p.routes = [...c.routes, ...p.routes];
        return p;
    }, f);

const fileRoutes2TS = (f: ast.File) =>
    f
        .routes
        .reduce(onlyRoutes2TS, [])
        .join('');

const onlyRoutes2TS = (p: TypeScript[], c: ast.Routes) =>
    (c instanceof ast.Route) ? p.concat(route2TS(c)) : p;

const wrapInFunc = (ts: TypeScript): TypeScript =>
    `(_m:Module) => {${EOL}${EOL}${ts}${EOL}}`;

const route2TS = (r: ast.Route): TypeScript =>
    `_m.install(${method2TS(r.method)},${pattern2TS(r.pattern)},` +
    (r.view ?
      `[${filters2TS(r.filters)},${view2TS(r.view)}]);${EOL}` :
      `[${filters2TS(r.filters)}]);${EOL}`);

const filters2TS = (filters: ast.Filter[]): TypeScript =>
    filters.map(filter2TS).join(',');

const method2TS = (m: ast.Method): TypeScript =>
    `'${m.toLowerCase()}'`;

const pattern2TS = (p: ast.Pattern): TypeScript =>
    `'${p.value}'`;

const view2TS = (view?: ast.View) => (view) ?
    `()=> pure(show(${literal2TS(view.view)}, ` +
    `${dict2TS(view.context)}))` :
    '';

const filter2TS = (f: ast.Filter): TypeScript =>
    `${identifier2TS(f.value)} ` +
    `${f.invoked ? '(' + f.args.map(value2TS).join(',') + ')' : ''} `;

const value2TS = (n: ast.Value): TypeScript => <TypeScript>match(n)
    .caseOf(ast.List, list2TS)
    .caseOf(ast.Dict, dict2TS)
    .caseOf(ast.StringLiteral, literal2TS)
    .caseOf(ast.NumberLiteral, literal2TS)
    .caseOf(ast.BooleanLiteral, literal2TS)
    .caseOf(ast.EnvVar, envVar2Ts)
    .caseOf(ast.UnqualifiedIdentifier, identifier2TS)
    .caseOf(ast.QualifiedIdentifier, identifier2TS)
    .end();

const list2TS = (l: ast.List): TypeScript =>
    `[${l.elements.map(value2TS).join(',')}]`;

const dict2TS = (d: ast.Dict): TypeScript => {

    let props = d.properties.map(p => `${value2TS(p.key)}: ${value2TS(p.value)} `);
    return `{ ${props.join(',\n')} } `;

}

const literal2TS = (n: ast.Literal): TypeScript =>
    (n instanceof ast.StringLiteral) ? `\`${n.value}\`` : n.value;

const envVar2Ts = (n: ast.EnvVar): TypeScript =>
    `process.env['${value2TS(n.key)}']`;

const identifier2TS = (i: ast.Identifier): TypeScript => <TypeScript>match(i)
    .caseOf(ast.QualifiedIdentifier, qualifiedIdentifier2TS)
    .caseOf(ast.UnqualifiedIdentifier, unqualifiedIdentifier2TS)
    .end();

const qualifiedIdentifier2TS = (n: ast.QualifiedIdentifier) =>
    n.path.map(unqualifiedIdentifier2TS).join(',');

const unqualifiedIdentifier2TS = (n: ast.UnqualifiedIdentifier) =>
    n.value;

/**
 * parse source text into an rcl File node.
 */
export const parse = (src: string): Future<ast.File> =>
    _parse(src, tree)
        .map(n => (n instanceof ast.File) ? pure(n) : raise(notFile(n)))
        .orRight(raise)
        .map((f: Future<ast.File>) => f)
        .takeRight();

const notFile = (n: ast.Node) =>
    new Error(`Expected a valid file got "${n.type}" after parsing!`);

/**
 * compile some source text into TypeScript code.
 */
export const compile = (src: string, ctx: Context): Future<TypeScript> =>
    parse(src).chain(f => file2TS(ctx, f));

