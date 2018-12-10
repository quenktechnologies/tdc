import * as jcon from './jcon';
import * as jconAst from '@quenk/jcon/lib/ast';
import * as rcl from './rcl';
import * as rclAst from '@quenk/rcl/lib/ast';
import { EOL } from 'os';
import {
    Path,
    exists,
    isDirectory,
    isFile,
    readTextFile,
    listDirsAbs,
    writeTextFile
} from '@quenk/noni/lib/io/file';
import { Future, pure, raise, parallel } from '@quenk/noni/lib/control/monad/future';
import { noop } from '@quenk/noni/lib/data/function';

export const FILE_CONF = 'conf';
export const FILE_ROUTE = 'routes';
export const FILE_INDEX = 'index.ts';
export const FILE_START = 'start.ts';

type ParsedFiles = [JCONFile, RCLFile];

type Parser<A> = (src: string) => Future<A>;

type TypeScript = string;

type Context = jcon.Context & rcl.Context;

type JCONFile = jconAst.File;

type RCLFile = rclAst.File;

export interface Arguments {

    '<module>': string,

    '--no-recurse': boolean,

    '--no-start': boolean,

    '--ignore': string[]

}

export interface Options {

    module: string,

    noRecurse: boolean,

    noStart: boolean,

    ignore: RegExp[]

}

const context = (cwd: Path) => ({

    loader: (path: Path) => readTextFile(`${cwd}/${path}`),

    jcon: jcon.parse,

    rcl: rcl.parse,

    tendril: '@quenk/tendril',

    EOL

});

/**
 * args2Opts function.
 */
export const args2Opts = (args: Arguments): Options => ({

    module: args['<module>'],

    noRecurse: args['--no-recurse'],

    noStart: args['--no-start'],

    ignore: ['node_modules'].concat(args['--ignore']).map(p => new RegExp(p))

})

/**
 * startTemplate provides the contant of the start.js file.
 */
export const startTemplate = () =>
    `import {App} from '@quenk/tendril/lib/app';${EOL}` +
    `import {template} from './';${EOL}${EOL}` +
    `let app = new App(template, {});${EOL}` +
    `app.start();`;

/**
 * isModule test.
 *
 * A directory is a module if it has a conf or routes file or both.
 */
export const isModule = (path: Path): Future<boolean> =>
    exists(path)
        .chain(yes => yes ?
            isDirectory(path)
                .chain(yes => (!yes) ?
                    pure(false) :
                    parallel([
                        isFile(`${path}/${FILE_CONF}`),
                        isFile(`${path}/${FILE_ROUTE}`)
                    ])
                        .chain(yess => pure((yess.filter(y => y).length > 0)))) :
            pure(false));

/**
 * exec the program.
 */
export const exec = (path: Path, opts: Options): Future<void> =>
    assertExists(path)
        .chain(() => assertDirectory(path))
        .chain(() => getTDCFiles(path))
        .chain(compile(path))
        .chain(ts => writeIndexFile(path, ts))
        .chain(() => opts.noRecurse ? pure(undefined) : execR(path, opts))
        .chain(() => opts.noStart ? pure(undefined) : writeStartFile(path));

const assertExists = (path: Path) =>
    exists(path)
        .chain(yes => yes ? pure(path) : raise(pathNotExistsErr(path)));

const assertDirectory = (path: Path) =>
    isDirectory(path)
        .chain(yes => yes ?
            pure(path) :
            raise(pathNotDirErr(path)));

const pathNotExistsErr = (path: Path) =>
    new Error(`The path ${path} does not exist!`);

const pathNotDirErr = (path: Path) =>
    new Error(`The path ${path} is not a directory!`);

export const getTDCFiles = (path: Path): Future<ParsedFiles> =>
    <Future<ParsedFiles>>parallel<RCLFile | JCONFile>([
        confFile(path),
        routeFile(path)
    ]);

const confFile = (path: Path): Future<JCONFile> =>
    getParsedFile(`${path}/${FILE_CONF}`, jcon.parse)

const routeFile = (path: Path): Future<RCLFile> =>
    getParsedFile(`${path}/${FILE_ROUTE}`, rcl.parse)

const getParsedFile = <A>(path: Path, parser: Parser<A>): Future<A> =>
    exists(path)
        .chain(yes => yes ? readTextFile(path) : pure(''))
        .chain(parser)

const compile = (path: Path) => ([conf, routes]: ParsedFiles)
    : Future<TypeScript> =>
    rcl
        .file2TS(context(path), routes)
        .chain(compileConf(conf, context(path)))
        .map(combine(context(path), conf, routes));

const compileConf = (conf: JCONFile, ctx: Context) => (rts: TypeScript) =>
    jcon.file2TS(ctx, addCreate(addRoutes(conf, rts)));

const addRoutes = (f: JCONFile, routes: string): JCONFile => {

    let loc = {};

    let path = [
        new jconAst.Identifier('app', loc),
        new jconAst.Identifier('routes', loc)
    ];

    let prop = new jconAst.Property(path,
        new jconAst.ArrowFunction(routes, loc), loc);

    f.directives.push(prop);

    return f;

}

const addCreate = (f: JCONFile): JCONFile => {

    let loc = {};

    let path = [

        new jconAst.Identifier('create', loc),

    ];

    let prop = new jconAst.Property(path,
        new jconAst.ArrowFunction('(a:App) => new Module(a)', loc), loc);

    f.directives.unshift(prop);

    return f;

}

const combine = (ctx: Context, conf: JCONFile, routes: RCLFile) =>
    (cts: TypeScript): TypeScript => [

        jcon.file2Imports(ctx, conf),
        rcl.imports2TS(rcl.file2Imports(routes)),
        `import {Template} from '@quenk/tendril/lib/app/module/template';`,
        `import {Module} from '@quenk/tendril/lib/app/module';`,
        `import {App} from '@quenk/tendril/lib/app'; `,
        ctx.EOL,
        `export const template: Template = ${ctx.EOL} ${cts}`

    ].join(EOL);

/**
 * execR executes recursively on a path.
 *
 * All directories under the given path will be checked for
 * TDC files, if any are found they will be turned into modules.
 */
export const execR = (path: Path, opts: Options): Future<void[]> =>
    listDirsAbs(path)
        .chain(paths => parallel(paths.map(recurse(opts))));

const recurse = (opts: Options) => (path: Path): Future<void> =>
    isIgnored(opts, path) ?
        pure(undefined) :
        isModule(path)
            .chain(yes => yes ?
                getTDCFiles(path)
                    .chain(compile(path))
                    .chain(ts => writeIndexFile(path, ts)) :
                pure(undefined))
            .chain(() => listDirsAbs(path))
            .chain(paths => parallel(paths.map(recurse(opts))))
            .map(noop);

const isIgnored = (opts: Options, path: Path): boolean =>
    opts.ignore.reduce((p, c) => (p === true) ? p : c.test(path), false);

/**
 * writeIndexFile writes out compile typescript to 
 * the index file of a path.
 */
export const writeIndexFile = (path: Path, ts: TypeScript) =>
    writeTextFile(`${path}/${FILE_INDEX}`, ts);

/**
 * writeStartFile writes out the start script to a destination/
 */
export const writeStartFile = (path: Path): Future<void> =>
    writeTextFile(`${path}/${FILE_START}`, startTemplate());
