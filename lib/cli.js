"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeStartFile = exports.writeIndexFile = exports.execR = exports.compile = exports.getTDCFiles = exports.exec = exports.isModule = exports.startTemplate = exports.args2Opts = exports.DEFAULT_MAIN = exports.FILE_START = exports.FILE_INDEX = exports.FILE_ROUTE = exports.FILE_CONF = void 0;
const jconAst = require("@quenk/jcon/lib/ast");
const jcon = require("./jcon");
const rcl = require("./rcl");
const os_1 = require("os");
const file_1 = require("@quenk/noni/lib/io/file");
const future_1 = require("@quenk/noni/lib/control/monad/future");
const function_1 = require("@quenk/noni/lib/data/function");
const transform_1 = require("./jcon/transform");
const imports_1 = require("./common/imports");
const record_1 = require("@quenk/noni/lib/data/record");
exports.FILE_CONF = 'conf';
exports.FILE_ROUTE = 'routes';
exports.FILE_INDEX = 'index.ts';
exports.FILE_START = 'start.ts';
exports.DEFAULT_MAIN = '@quenk/tendril/lib/app#App';
const newContext = (root, path) => ({
    path,
    root,
    locals: [],
    loader: (target) => file_1.readTextFile(`${path}/${target}`),
    jcon: jcon.parse,
    rcl: rcl.parse,
    tendril: '@quenk/tendril',
    EOL: os_1.EOL
});
/**
 * args2Opts function.
 */
const args2Opts = (args) => ({
    module: args['<module>'],
    noRecurse: args['--no-recurse'],
    noStart: args['--no-start'],
    ignore: ['node_modules'].concat(args['--ignore']).map(p => new RegExp(p)),
    main: (args['--main'] != null) ? args['--main'] : exports.DEFAULT_MAIN,
    rootDir: (args['--root-dir'] != null) ? args['--root-dir'] : process.cwd()
});
exports.args2Opts = args2Opts;
/**
 * startTemplate provides the contant of the start.js file.
 */
const startTemplate = (opts) => getMainImport(opts) +
    `import {template} from './';${os_1.EOL}${os_1.EOL}` +
    `let app = new App(template);${os_1.EOL}` +
    `app.start().fork(e => { throw e; }, ()=>{});`;
exports.startTemplate = startTemplate;
const getMainImport = (opts) => {
    let [mod, exp] = opts.main.split('#');
    return `import {${exp} as App} from '${mod}';${os_1.EOL}`;
};
/**
 * isModule tests whether a directory is a module or not.
 *
 * A directory is a module if it has either a conf or routes file or both.
 */
const isModule = (path) => future_1.doFuture(function* () {
    let isfile = yield file_1.exists(path);
    if (isfile) {
        let isdir = yield file_1.isDirectory(path);
        if (isdir) {
            let targets = [
                file_1.isFile(`${path}/${exports.FILE_CONF}`),
                file_1.isFile(`${path}/${exports.FILE_ROUTE}`)
            ];
            let results = yield future_1.parallel(targets);
            return future_1.pure(results.filter(y => y).length > 0);
        }
    }
    return future_1.pure(false);
});
exports.isModule = isModule;
/**
 * exec the program.
 */
const exec = (path, opts) => future_1.doFuture(function* () {
    let pathExists = yield file_1.exists(path);
    if (!pathExists)
        yield future_1.raise(pathNotExistsErr(path));
    let isdir = yield file_1.isDirectory(path);
    if (!isdir)
        yield future_1.raise(pathNotDirErr(path));
    let files = yield exports.getTDCFiles(path);
    let ts = yield exports.compile(files, opts, path);
    yield exports.writeIndexFile(path, ts);
    if (!opts.noRecurse)
        yield exports.execR(path, opts);
    if (!opts.noStart)
        yield exports.writeStartFile(path, opts);
    return future_1.pure(undefined);
});
exports.exec = exec;
const pathNotExistsErr = (path) => new Error(`The path ${path} does not exist!`);
const pathNotDirErr = (path) => new Error(`The path ${path} is not a directory!`);
/**
 * getFiles provides the parsed conf file and routes file.
 *
 * If they don't exist, an empty string is passed to the relevant parser.
 */
const getTDCFiles = (path) => future_1.doFuture(function* () {
    let conf = yield getParsedFile(`${path}/${exports.FILE_CONF}`, jcon.parse);
    let routes = yield getParsedFile(`${path}/${exports.FILE_ROUTE}`, rcl.parse);
    return future_1.pure([conf, routes]);
});
exports.getTDCFiles = getTDCFiles;
const getParsedFile = (path, parser) => file_1.exists(path)
    .chain(yes => yes ? file_1.readTextFile(path) : future_1.pure(''))
    .chain(parser);
/**
 * @private
 */
const compile = ([conf, routes], opts, path) => future_1.doFuture(function* () {
    let ctx = newContext(opts.rootDir, path);
    let rclCode = yield rcl.file2TS(ctx, routes);
    let jconTree = yield transform_1.transformTree(ctx, addCreate(addRoutes(conf, rclCode)));
    let imports = record_1.merge(jcon.getAllImports(jconTree.directives), rcl.getAllImports(routes));
    let jconCode = jcon.file2TS(ctx, jconTree);
    let combinedCode = [
        imports_1.toCode(imports),
        `//@ts-ignore: 6133`,
        `import * as _json from '@quenk/noni/lib/data/jsonx';`,
        `//@ts-ignore: 6133`,
        `import {Template} from '@quenk/tendril/lib/app/module/template';`,
        `//@ts-ignore: 6133`,
        `import {Module} from '@quenk/tendril/lib/app/module';`,
        `//@ts-ignore: 6133`,
        `import {Request} from '@quenk/tendril/lib/app/api/request;'`,
        getMainImport(opts),
        ctx.EOL,
        `export const template = (_app: App): Template<App> => ` +
            `(${ctx.EOL} ${jconCode})`
    ].join(os_1.EOL);
    return future_1.pure(combinedCode);
});
exports.compile = compile;
const addRoutes = (f, routes) => {
    let loc = {};
    let path = [
        new jconAst.Identifier('app', loc),
        new jconAst.Identifier('routes', loc)
    ];
    let prop = new jconAst.Property(path, new jconAst.Function(routes, loc), loc);
    f.directives.push(prop);
    return f;
};
const addCreate = (f) => {
    let loc = {};
    let path = [
        new jconAst.Identifier('create', loc),
    ];
    let prop = new jconAst.Property(path, new jconAst.Function(`${os_1.EOL}//@ts-ignore: 6133 ${os_1.EOL}` +
        `(_app:App) => new Module(_app)`, loc), loc);
    f.directives.unshift(prop);
    return f;
};
/**
 * execR executes recursively on a path.
 *
 * All directories under the given path will be checked for
 * TDC files, if any are found they will be turned into modules.
 */
const execR = (path, opts) => file_1.listDirsAbs(path)
    .chain(paths => future_1.parallel(paths.map(recurse(opts))));
exports.execR = execR;
const recurse = (opts) => (path) => isIgnored(opts, path) ?
    future_1.pure(undefined) :
    exports.isModule(path)
        .chain(yes => yes ?
        exports.getTDCFiles(path)
            .chain(files => exports.compile(files, opts, path))
            .chain(ts => exports.writeIndexFile(path, ts)) :
        future_1.pure(undefined))
        .chain(() => file_1.listDirsAbs(path))
        .chain(paths => future_1.parallel(paths.map(recurse(opts))))
        .map(function_1.noop);
const isIgnored = (opts, path) => opts.ignore.reduce((p, c) => (p === true) ?
    p :
    c.test(path), false);
/**
 * writeIndexFile writes out compile typescript to
 * the index file of a path.
 */
const writeIndexFile = (path, ts) => file_1.writeTextFile(`${path}/${exports.FILE_INDEX}`, ts);
exports.writeIndexFile = writeIndexFile;
/**
 * writeStartFile writes out the start script to a destination/
 */
const writeStartFile = (path, opts) => file_1.writeTextFile(`${path}/${exports.FILE_START}`, exports.startTemplate(opts));
exports.writeStartFile = writeStartFile;
//# sourceMappingURL=cli.js.map