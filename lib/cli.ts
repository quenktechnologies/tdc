import * as jconAst from '@quenk/jcon/lib/ast';
import * as rclAst from '@quenk/rcl/lib/ast';
import * as jcon from './jcon';
import * as rcl from './rcl';

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
import {
    Future,
    pure,
    raise,
    parallel,
    doFuture
} from '@quenk/noni/lib/control/monad/future';
import { noop } from '@quenk/noni/lib/data/function';

import { transformTree } from './jcon/transform';
import { toCode } from './common/imports';
import { merge } from '@quenk/noni/lib/data/record';

export const FILE_CONF = 'conf';
export const FILE_ROUTE = 'routes';
export const FILE_INDEX = 'index.ts';
export const FILE_START = 'start.ts';
export const DEFAULT_MAIN = '@quenk/tendril/lib/app#App';
export const TDC_MERGE_COMMENT = '/*tdc-output*/';

type ParsedFiles = [JCONFile, RCLFile];

type Parser<A> = (src: string) => Future<A>;

type TypeScript = string;

type JCONFile = jconAst.File;

type RCLFile = rclAst.File;

export interface Arguments {

    '<module>': string,

    '--no-recurse': boolean,

    '--no-start': boolean,

    '--ignore': string[],

    '--main': string,

    '--root-dir': string

}

export interface Options {

    module: string,

    noRecurse: boolean,

    noStart: boolean,

    ignore: RegExp[],

    main: string,

    rootDir: string

}

const newContext = (root: Path, path: Path) => ({

    path,

    root,

    locals: <string[]>[],

    loader: (target: Path) => readTextFile(`${path}/${target}`),

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

    ignore: ['node_modules'].concat(args['--ignore']).map(p => new RegExp(p)),

    main: (args['--main'] != null) ? args['--main'] : DEFAULT_MAIN,

    rootDir: (args['--root-dir'] != null) ? args['--root-dir'] : process.cwd()

})

/**
 * startTemplate provides the contant of the start.js file.
 */
export const startTemplate = (opts: Options) =>
    getMainImport(opts) +
    `import {template} from './';${EOL}${EOL}` +
    `let app = new App(template);${EOL}` +
    `app.start().fork(e => { throw e; }, ()=>{});`;

const getMainImport = (opts: Options) => {

    let [mod, exp] = opts.main.split('#');

    return `import {${exp} as App} from '${mod}';${EOL}`;

}

/**
 * isModule tests whether a directory is a module or not.
 *
 * A directory is a module if it has either a conf or routes file or both.
 */
export const isModule = (path: Path): Future<boolean> =>
    doFuture<boolean>(function*() {

        let isfile = yield exists(path);

        if (isfile) {

            let isdir = yield isDirectory(path);

            if (isdir) {

                let targets = [
                    isFile(`${path}/${FILE_CONF}`),
                    isFile(`${path}/${FILE_ROUTE}`)
                ];

                let results: boolean[] = yield parallel(targets);

                return pure(results.filter(y => y).length > 0);

            }

        }

        return pure(false);

    });

/**
 * exec the program.
 */
export const exec = (path: Path, opts: Options): Future<void> =>
    doFuture<void>(function*() {

        let pathExists = yield exists(path);

        if (!pathExists) yield raise<void>(pathNotExistsErr(path));

        let isdir = yield isDirectory(path);

        if (!isdir) yield raise<void>(pathNotDirErr(path));

        let files = yield getTDCFiles(path);

        let ts = yield compile(files, opts, path);

        yield writeIndexFile(path, ts);

        if (!opts.noRecurse)
            yield execR(path, opts);

        if (!opts.noStart)
            yield writeStartFile(path, opts);

        return pure(undefined);

    });

const pathNotExistsErr = (path: Path) =>
    new Error(`The path ${path} does not exist!`);

const pathNotDirErr = (path: Path) =>
    new Error(`The path ${path} is not a directory!`);

/**
 * getFiles provides the parsed conf file and routes file.
 *
 * If they don't exist, an empty string is passed to the relevant parser.
 */
export const getTDCFiles = (path: Path): Future<ParsedFiles> =>
    doFuture<ParsedFiles>(function*() {

        let conf = yield getParsedFile(`${path}/${FILE_CONF}`, jcon.parse);

        let routes = yield getParsedFile(`${path}/${FILE_ROUTE}`, rcl.parse);

        return pure(<ParsedFiles>[conf, routes]);

    });

const getParsedFile = <A>(path: Path, parser: Parser<A>): Future<A> =>
    exists(path)
        .chain(yes => yes ? readTextFile(path) : pure(''))
        .chain(parser)

/**
 * @private
 */
export const compile = ([conf, routes]: ParsedFiles, opts: Options, path: Path) =>
    doFuture<TypeScript>(function*() {

        let ctx = newContext(opts.rootDir, path);

        let rclCode = yield rcl.file2TS(ctx, routes);

        let jconTree = yield transformTree(
            ctx,
            addCreate(addRoutes(conf, rclCode))
        );

        let imports = merge(
            jcon.getAllImports(jconTree.directives),
            rcl.getAllImports(routes)
        );

        let jconCode = jcon.file2TS(ctx, jconTree);

        let combinedCode = [

            toCode(imports),

            `//@ts-ignore: 6133`,
            `import {System} from '@quenk/potoo/lib/actor/system';`,
            `//@ts-ignore: 6133`,
            `import * as _json from '@quenk/noni/lib/data/jsonx';`,
            `//@ts-ignore: 6133`,
            `import {Template} from '@quenk/tendril/lib/app/module/template';`,
            `//@ts-ignore: 6133`,
            `import {Module} from '@quenk/tendril/lib/app/module';`,
            `//@ts-ignore: 6133`,
            `import {Request} from '@quenk/tendril/lib/app/api/request;'`,
            `//@ts-ignore: 6133`,
            `import {RouteConf as $RouteConf} from '@quenk/tendril/lib/app/module';`,
            getMainImport(opts),
            ctx.EOL,
            `//@ts-ignore: 6133`,
            `export const template = ($app: App): Template => ` +
            `(${ctx.EOL} ${jconCode})`

        ].join(EOL);

        return pure(combinedCode);

    });

const addRoutes = (f: JCONFile, routes: string): JCONFile => {

    let loc = {};

    let path = [
        new jconAst.Identifier('app', loc),
        new jconAst.Identifier('routes', loc)
    ];

    let prop = new jconAst.Property(path,
        new jconAst.Function(routes, loc), loc);

    f.directives.push(prop);

    return f;

}

const addCreate = (f: JCONFile): JCONFile => {

    let loc = {};

    let path = [

        new jconAst.Identifier('create', loc),

    ];

    let prop = new jconAst.Property(path,
        new jconAst.Function(`${EOL}//@ts-ignore: 6133 ${EOL}` +
            `(s:System) => new Module(<App>s)`, loc), loc);

    f.directives.unshift(prop);

    return f;

}

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
                    .chain(files => compile(files, opts, path))
                    .chain(ts => writeIndexFile(path, ts)) :
                pure(undefined))
            .chain(() => listDirsAbs(path))
            .chain(paths => parallel(paths.map(recurse(opts))))
            .map(noop);

const isIgnored = (opts: Options, path: Path): boolean =>
    opts.ignore.reduce((p, c) => (p === true) ?
        p :
        c.test(path), <boolean>false);

/**
 * writeIndexFile writes out compiled typescript to the index file of a path.
 *
 * If the file already exists we attempt to merge it with the output via 
 * the TDC_MERGE_COMMENT
 */
export const writeIndexFile = (path: Path, ts: TypeScript) => 
  doFuture(function*() { 

    let indexFile = `${path}/${FILE_INDEX}`; 

    if(yield isFile(indexFile)) {

      let contents = yield readTextFile(indexFile);

      ts = ts.replace(TDC_MERGE_COMMENT,  contents);

    }

   return writeTextFile(indexFile, ts);

});

/**
 * writeStartFile writes out the start script to a destination/
 */
export const writeStartFile = (path: Path, opts: Options): Future<void> =>
    writeTextFile(`${path}/${FILE_START}`, startTemplate(opts));
