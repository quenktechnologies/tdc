"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeStartFile = exports.writeIndexFile = exports.execR = exports.compile = exports.getTDCFiles = exports.exec = exports.isModule = exports.startTemplate = exports.args2Opts = exports.TDC_MERGE_EXPORTS = exports.TDC_MERGE_IMPORTS = exports.DEFAULT_MAIN = exports.FILE_START = exports.FILE_INDEX = exports.FILE_ROUTE = exports.FILE_CONF = void 0;
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
exports.TDC_MERGE_IMPORTS = /\/\*\s*tdc-output-imports\s*\*/;
exports.TDC_MERGE_EXPORTS = /\/\*\s*tdc-output-exports\s*\*/;
const newContext = (root, path) => ({
    path,
    root,
    locals: [],
    loader: (target) => (0, file_1.readTextFile)(`${path}/${target}`),
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
const startTemplate = (opts) => [
    [getMainImport(opts) +
            `import {template} from './';${os_1.EOL}`
    ].join(os_1.EOL),
    [
        `let app = new App(template);${os_1.EOL}` +
            `app.start().fork(e => { throw e; }, ()=>{});`
    ].join(os_1.EOL)
];
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
const isModule = (path) => (0, future_1.doFuture)(function* () {
    let isfile = yield (0, file_1.exists)(path);
    if (isfile) {
        let isdir = yield (0, file_1.isDirectory)(path);
        if (isdir) {
            let targets = [
                (0, file_1.isFile)(`${path}/${exports.FILE_CONF}`),
                (0, file_1.isFile)(`${path}/${exports.FILE_ROUTE}`)
            ];
            let results = yield (0, future_1.parallel)(targets);
            return (0, future_1.pure)(results.filter(y => y).length > 0);
        }
    }
    return (0, future_1.pure)(false);
});
exports.isModule = isModule;
/**
 * exec the program.
 */
const exec = (path, opts) => (0, future_1.doFuture)(function* () {
    let pathExists = yield (0, file_1.exists)(path);
    if (!pathExists)
        yield (0, future_1.raise)(pathNotExistsErr(path));
    let isdir = yield (0, file_1.isDirectory)(path);
    if (!isdir)
        yield (0, future_1.raise)(pathNotDirErr(path));
    let files = yield (0, exports.getTDCFiles)(path);
    let ts = yield (0, exports.compile)(files, opts, path);
    yield (0, exports.writeIndexFile)(path, ts);
    if (!opts.noRecurse)
        yield (0, exports.execR)(path, opts);
    if (!opts.noStart)
        yield (0, exports.writeStartFile)(path, opts);
    return (0, future_1.pure)(undefined);
});
exports.exec = exec;
const pathNotExistsErr = (path) => new Error(`The path ${path} does not exist!`);
const pathNotDirErr = (path) => new Error(`The path ${path} is not a directory!`);
/**
 * getFiles provides the parsed conf file and routes file.
 *
 * If they don't exist, an empty string is passed to the relevant parser.
 */
const getTDCFiles = (path) => (0, future_1.doFuture)(function* () {
    let conf = yield getParsedFile(`${path}/${exports.FILE_CONF}`, jcon.parse);
    let routes = yield getParsedFile(`${path}/${exports.FILE_ROUTE}`, rcl.parse);
    return (0, future_1.pure)([conf, routes]);
});
exports.getTDCFiles = getTDCFiles;
const getParsedFile = (path, parser) => (0, file_1.exists)(path)
    .chain(yes => yes ? (0, file_1.readTextFile)(path) : (0, future_1.pure)(''))
    .chain(parser);
/**
 * @private
 */
const compile = ([conf, routes], opts, path) => (0, future_1.doFuture)(function* () {
    let ctx = newContext(opts.rootDir, path);
    let rclCode = yield rcl.file2TS(ctx, routes);
    let jconTree = yield (0, transform_1.transformTree)(ctx, addCreate(addRoutes(conf, rclCode)));
    let imports = (0, record_1.merge)(jcon.getAllImports(jconTree.directives), rcl.getAllImports(routes));
    let jconCode = jcon.file2TS(ctx, jconTree);
    return (0, future_1.pure)([
        [
            (0, imports_1.toCode)(imports),
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
            ctx.EOL
        ].join(ctx.EOL),
        [`//@ts-ignore: 6133`,
            `export const template = ($app: App): Template => ` +
                `(${ctx.EOL} ${jconCode})`
        ].join(os_1.EOL)
    ]);
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
        `(s:System) => new Module(<App>s)`, loc), loc);
    f.directives.unshift(prop);
    return f;
};
/**
 * execR executes recursively on a path.
 *
 * All directories under the given path will be checked for
 * TDC files, if any are found they will be turned into modules.
 */
const execR = (path, opts) => (0, file_1.listDirsAbs)(path)
    .chain(paths => (0, future_1.parallel)(paths.map(recurse(opts))));
exports.execR = execR;
const recurse = (opts) => (path) => isIgnored(opts, path) ?
    (0, future_1.pure)(undefined) :
    (0, exports.isModule)(path)
        .chain(yes => yes ?
        (0, exports.getTDCFiles)(path)
            .chain(files => (0, exports.compile)(files, opts, path))
            .chain(ts => (0, exports.writeIndexFile)(path, ts)) :
        (0, future_1.pure)(undefined))
        .chain(() => (0, file_1.listDirsAbs)(path))
        .chain(paths => (0, future_1.parallel)(paths.map(recurse(opts))))
        .map(function_1.noop);
const isIgnored = (opts, path) => opts.ignore.reduce((p, c) => (p === true) ?
    p :
    c.test(path), false);
/**
 * writeIndexFile writes out compiled typescript to the index file of a path.
 *
 * If the file already exists we attempt to merge it with the output via
 * the TDC_MERGE_COMMENT
 */
const writeIndexFile = (path, ts) => writeOutput(`${path}/${exports.FILE_INDEX}`, ts);
exports.writeIndexFile = writeIndexFile;
/**
 * writeStartFile writes out the start script to a destination/
 */
const writeStartFile = (path, opts) => writeOutput(`${path}/${exports.FILE_START}`, (0, exports.startTemplate)(opts));
exports.writeStartFile = writeStartFile;
/**
 * writeOutput writes out compiled typescript to the specified path.
 *
 * If the file already exists we attempt to merge it with the output via
 * the TDC_MERGE_IMPORTS and TDC_MERGE_EXPORTS comment.
 */
const writeOutput = (path, [imports, exports]) => (0, future_1.doFuture)(function* () {
    let ts = '';
    if (yield (0, file_1.isFile)(path)) {
        let contents = yield (0, file_1.readTextFile)(path);
        contents = contents.replace(exports.TDC_MERGE_IMPORTS, imports);
        contents = contents.replace(exports.TDC_MERGE_EXPORTS, exports);
        ts = contents;
    }
    else {
        ts = [imports, exports].join('');
    }
    return (0, file_1.writeTextFile)(path, ts);
});
//# sourceMappingURL=cli.js.map