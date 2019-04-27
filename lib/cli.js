"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jcon = require("./jcon");
var jconAst = require("@quenk/jcon/lib/ast");
var rcl = require("./rcl");
var os_1 = require("os");
var file_1 = require("@quenk/noni/lib/io/file");
var future_1 = require("@quenk/noni/lib/control/monad/future");
var function_1 = require("@quenk/noni/lib/data/function");
exports.FILE_CONF = 'conf';
exports.FILE_ROUTE = 'routes';
exports.FILE_INDEX = 'index.ts';
exports.FILE_START = 'start.ts';
var context = function (cwd) { return ({
    loader: function (path) { return file_1.readTextFile(cwd + "/" + path); },
    jcon: jcon.parse,
    rcl: rcl.parse,
    tendril: '@quenk/tendril',
    EOL: os_1.EOL
}); };
/**
 * args2Opts function.
 */
exports.args2Opts = function (args) { return ({
    module: args['<module>'],
    noRecurse: args['--no-recurse'],
    noStart: args['--no-start'],
    ignore: ['node_modules'].concat(args['--ignore']).map(function (p) { return new RegExp(p); })
}); };
/**
 * startTemplate provides the contant of the start.js file.
 */
exports.startTemplate = function () {
    return "import {App} from '@quenk/tendril/lib/app';" + os_1.EOL +
        ("import {template} from './';" + os_1.EOL + os_1.EOL) +
        ("let app = new App(template, template.app && template.app.system || {});" + os_1.EOL) +
        "app.start().fork(e => { throw e; }, ()=>{});";
};
/**
 * isModule test.
 *
 * A directory is a module if it has a conf or routes file or both.
 */
exports.isModule = function (path) {
    return file_1.exists(path)
        .chain(function (yes) { return yes ?
        file_1.isDirectory(path)
            .chain(function (yes) { return (!yes) ?
            future_1.pure(false) :
            future_1.parallel([
                file_1.isFile(path + "/" + exports.FILE_CONF),
                file_1.isFile(path + "/" + exports.FILE_ROUTE)
            ])
                .chain(function (yess) { return future_1.pure((yess.filter(function (y) { return y; }).length > 0)); }); }) :
        future_1.pure(false); });
};
/**
 * exec the program.
 */
exports.exec = function (path, opts) {
    return assertExists(path)
        .chain(function () { return assertDirectory(path); })
        .chain(function () { return exports.getTDCFiles(path); })
        .chain(compile(path))
        .chain(function (ts) { return exports.writeIndexFile(path, ts); })
        .chain(function () { return opts.noRecurse ? future_1.pure(undefined) : exports.execR(path, opts); })
        .chain(function () { return opts.noStart ? future_1.pure(undefined) : exports.writeStartFile(path); });
};
var assertExists = function (path) {
    return file_1.exists(path)
        .chain(function (yes) { return yes ? future_1.pure(path) : future_1.raise(pathNotExistsErr(path)); });
};
var assertDirectory = function (path) {
    return file_1.isDirectory(path)
        .chain(function (yes) { return yes ?
        future_1.pure(path) :
        future_1.raise(pathNotDirErr(path)); });
};
var pathNotExistsErr = function (path) {
    return new Error("The path " + path + " does not exist!");
};
var pathNotDirErr = function (path) {
    return new Error("The path " + path + " is not a directory!");
};
exports.getTDCFiles = function (path) {
    return future_1.parallel([
        confFile(path),
        routeFile(path)
    ]);
};
var confFile = function (path) {
    return getParsedFile(path + "/" + exports.FILE_CONF, jcon.parse);
};
var routeFile = function (path) {
    return getParsedFile(path + "/" + exports.FILE_ROUTE, rcl.parse);
};
var getParsedFile = function (path, parser) {
    return file_1.exists(path)
        .chain(function (yes) { return yes ? file_1.readTextFile(path) : future_1.pure(''); })
        .chain(parser);
};
var compile = function (path) { return function (_a) {
    var conf = _a[0], routes = _a[1];
    return rcl
        .file2TS(context(path), routes)
        .chain(compileConf(conf, context(path)))
        .map(combine(context(path), conf, routes));
}; };
var compileConf = function (conf, ctx) { return function (rts) {
    return jcon.file2TS(ctx, addCreate(addRoutes(conf, rts)));
}; };
var addRoutes = function (f, routes) {
    var loc = {};
    var path = [
        new jconAst.Identifier('app', loc),
        new jconAst.Identifier('routes', loc)
    ];
    var prop = new jconAst.Property(path, new jconAst.ArrowFunction(routes, loc), loc);
    f.directives.push(prop);
    return f;
};
var addCreate = function (f) {
    var loc = {};
    var path = [
        new jconAst.Identifier('create', loc),
    ];
    var prop = new jconAst.Property(path, new jconAst.ArrowFunction('(a:App) => new Module(a)', loc), loc);
    f.directives.unshift(prop);
    return f;
};
var combine = function (ctx, conf, routes) {
    return function (cts) { return [
        jcon.file2Imports(ctx, conf),
        rcl.imports2TS(rcl.file2Imports(routes)),
        "import {Template} from '@quenk/tendril/lib/app/module/template';",
        "import {Module} from '@quenk/tendril/lib/app/module';",
        "import {App} from '@quenk/tendril/lib/app'; ",
        ctx.EOL,
        "export const template: Template = " + ctx.EOL + " " + cts
    ].join(os_1.EOL); };
};
/**
 * execR executes recursively on a path.
 *
 * All directories under the given path will be checked for
 * TDC files, if any are found they will be turned into modules.
 */
exports.execR = function (path, opts) {
    return file_1.listDirsAbs(path)
        .chain(function (paths) { return future_1.parallel(paths.map(recurse(opts))); });
};
var recurse = function (opts) { return function (path) {
    return isIgnored(opts, path) ?
        future_1.pure(undefined) :
        exports.isModule(path)
            .chain(function (yes) { return yes ?
            exports.getTDCFiles(path)
                .chain(compile(path))
                .chain(function (ts) { return exports.writeIndexFile(path, ts); }) :
            future_1.pure(undefined); })
            .chain(function () { return file_1.listDirsAbs(path); })
            .chain(function (paths) { return future_1.parallel(paths.map(recurse(opts))); })
            .map(function_1.noop);
}; };
var isIgnored = function (opts, path) {
    return opts.ignore.reduce(function (p, c) { return (p === true) ? p : c.test(path); }, false);
};
/**
 * writeIndexFile writes out compile typescript to
 * the index file of a path.
 */
exports.writeIndexFile = function (path, ts) {
    return file_1.writeTextFile(path + "/" + exports.FILE_INDEX, ts);
};
/**
 * writeStartFile writes out the start script to a destination/
 */
exports.writeStartFile = function (path) {
    return file_1.writeTextFile(path + "/" + exports.FILE_START, exports.startTemplate());
};
//# sourceMappingURL=cli.js.map