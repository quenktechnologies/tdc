"use strict";
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeStartFile = exports.writeIndexFile = exports.execR = exports.compile = exports.getTDCFiles = exports.exec = exports.isModule = exports.startTemplate = exports.args2Opts = exports.DEFAULT_MAIN = exports.FILE_START = exports.FILE_INDEX = exports.FILE_ROUTE = exports.FILE_CONF = void 0;
var jconAst = require("@quenk/jcon/lib/ast");
var jcon = require("./jcon");
var rcl = require("./rcl");
var os_1 = require("os");
var file_1 = require("@quenk/noni/lib/io/file");
var future_1 = require("@quenk/noni/lib/control/monad/future");
var function_1 = require("@quenk/noni/lib/data/function");
var transform_1 = require("./jcon/transform");
var imports_1 = require("./common/imports");
var record_1 = require("@quenk/noni/lib/data/record");
exports.FILE_CONF = 'conf';
exports.FILE_ROUTE = 'routes';
exports.FILE_INDEX = 'index.ts';
exports.FILE_START = 'start.ts';
exports.DEFAULT_MAIN = '@quenk/tendril/lib/app#App';
var newContext = function (root, path) { return ({
    path: path,
    root: root,
    locals: [],
    loader: function (target) { return file_1.readTextFile(path + "/" + target); },
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
    ignore: ['node_modules'].concat(args['--ignore']).map(function (p) { return new RegExp(p); }),
    main: (args['--main'] != null) ? args['--main'] : exports.DEFAULT_MAIN,
    rootDir: (args['--root-dir'] != null) ? args['--root-dir'] : process.cwd()
}); };
/**
 * startTemplate provides the contant of the start.js file.
 */
exports.startTemplate = function (opts) {
    return getMainImport(opts) +
        ("import {template} from './';" + os_1.EOL + os_1.EOL) +
        ("let app = new App(template);" + os_1.EOL) +
        "app.start().fork(e => { throw e; }, ()=>{});";
};
var getMainImport = function (opts) {
    var _a = opts.main.split('#'), mod = _a[0], exp = _a[1];
    return "import {" + exp + " as App} from '" + mod + "';" + os_1.EOL;
};
/**
 * isModule tests whether a directory is a module or not.
 *
 * A directory is a module if it has either a conf or routes file or both.
 */
exports.isModule = function (path) {
    return future_1.doFuture(function () {
        var isfile, isdir, targets, results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_1.exists(path)];
                case 1:
                    isfile = _a.sent();
                    if (!isfile) return [3 /*break*/, 4];
                    return [4 /*yield*/, file_1.isDirectory(path)];
                case 2:
                    isdir = _a.sent();
                    if (!isdir) return [3 /*break*/, 4];
                    targets = [
                        file_1.isFile(path + "/" + exports.FILE_CONF),
                        file_1.isFile(path + "/" + exports.FILE_ROUTE)
                    ];
                    return [4 /*yield*/, future_1.parallel(targets)];
                case 3:
                    results = _a.sent();
                    return [2 /*return*/, future_1.pure(results.filter(function (y) { return y; }).length > 0)];
                case 4: return [2 /*return*/, future_1.pure(false)];
            }
        });
    });
};
/**
 * exec the program.
 */
exports.exec = function (path, opts) {
    return future_1.doFuture(function () {
        var pathExists, isdir, files, ts;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_1.exists(path)];
                case 1:
                    pathExists = _a.sent();
                    if (!!pathExists) return [3 /*break*/, 3];
                    return [4 /*yield*/, future_1.raise(pathNotExistsErr(path))];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [4 /*yield*/, file_1.isDirectory(path)];
                case 4:
                    isdir = _a.sent();
                    if (!!isdir) return [3 /*break*/, 6];
                    return [4 /*yield*/, future_1.raise(pathNotDirErr(path))];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [4 /*yield*/, exports.getTDCFiles(path)];
                case 7:
                    files = _a.sent();
                    return [4 /*yield*/, exports.compile(files, opts, path)];
                case 8:
                    ts = _a.sent();
                    return [4 /*yield*/, exports.writeIndexFile(path, ts)];
                case 9:
                    _a.sent();
                    if (!!opts.noRecurse) return [3 /*break*/, 11];
                    return [4 /*yield*/, exports.execR(path, opts)];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11:
                    if (!!opts.noStart) return [3 /*break*/, 13];
                    return [4 /*yield*/, exports.writeStartFile(path, opts)];
                case 12:
                    _a.sent();
                    _a.label = 13;
                case 13: return [2 /*return*/, future_1.pure(undefined)];
            }
        });
    });
};
var pathNotExistsErr = function (path) {
    return new Error("The path " + path + " does not exist!");
};
var pathNotDirErr = function (path) {
    return new Error("The path " + path + " is not a directory!");
};
/**
 * getFiles provides the parsed conf file and routes file.
 *
 * If they don't exist, an empty string is passed to the relevant parser.
 */
exports.getTDCFiles = function (path) {
    return future_1.doFuture(function () {
        var conf, routes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getParsedFile(path + "/" + exports.FILE_CONF, jcon.parse)];
                case 1:
                    conf = _a.sent();
                    return [4 /*yield*/, getParsedFile(path + "/" + exports.FILE_ROUTE, rcl.parse)];
                case 2:
                    routes = _a.sent();
                    return [2 /*return*/, future_1.pure([conf, routes])];
            }
        });
    });
};
var getParsedFile = function (path, parser) {
    return file_1.exists(path)
        .chain(function (yes) { return yes ? file_1.readTextFile(path) : future_1.pure(''); })
        .chain(parser);
};
/**
 * @private
 */
exports.compile = function (_a, opts, path) {
    var conf = _a[0], routes = _a[1];
    return future_1.doFuture(function () {
        var ctx, rclCode, jconTree, imports, jconCode, combinedCode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ctx = newContext(opts.rootDir, path);
                    return [4 /*yield*/, rcl.file2TS(ctx, routes)];
                case 1:
                    rclCode = _a.sent();
                    return [4 /*yield*/, transform_1.transformTree(ctx, addCreate(addRoutes(conf, rclCode)))];
                case 2:
                    jconTree = _a.sent();
                    imports = record_1.merge(jcon.getAllImports(jconTree.directives), rcl.getAllImports(routes));
                    jconCode = jcon.file2TS(ctx, jconTree);
                    combinedCode = [
                        imports_1.toCode(imports),
                        "//@ts-ignore: 6133",
                        "import * as _json from '@quenk/noni/lib/data/jsonx';",
                        "//@ts-ignore: 6133",
                        "import {Template} from '@quenk/tendril/lib/app/module/template';",
                        "//@ts-ignore: 6133",
                        "import {Module} from '@quenk/tendril/lib/app/module';",
                        "//@ts-ignore: 6133",
                        "import {Request} from '@quenk/tendril/lib/app/api/request;'",
                        getMainImport(opts),
                        ctx.EOL,
                        "export const template = (_app: App): Template<App> => " +
                            ("(" + ctx.EOL + " " + jconCode + ")")
                    ].join(os_1.EOL);
                    return [2 /*return*/, future_1.pure(combinedCode)];
            }
        });
    });
};
var addRoutes = function (f, routes) {
    var loc = {};
    var path = [
        new jconAst.Identifier('app', loc),
        new jconAst.Identifier('routes', loc)
    ];
    var prop = new jconAst.Property(path, new jconAst.Function(routes, loc), loc);
    f.directives.push(prop);
    return f;
};
var addCreate = function (f) {
    var loc = {};
    var path = [
        new jconAst.Identifier('create', loc),
    ];
    var prop = new jconAst.Property(path, new jconAst.Function(os_1.EOL + "//@ts-ignore: 6133 " + os_1.EOL +
        "(_app:App) => new Module(_app)", loc), loc);
    f.directives.unshift(prop);
    return f;
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
                .chain(function (files) { return exports.compile(files, opts, path); })
                .chain(function (ts) { return exports.writeIndexFile(path, ts); }) :
            future_1.pure(undefined); })
            .chain(function () { return file_1.listDirsAbs(path); })
            .chain(function (paths) { return future_1.parallel(paths.map(recurse(opts))); })
            .map(function_1.noop);
}; };
var isIgnored = function (opts, path) {
    return opts.ignore.reduce(function (p, c) { return (p === true) ?
        p :
        c.test(path); }, false);
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
exports.writeStartFile = function (path, opts) {
    return file_1.writeTextFile(path + "/" + exports.FILE_START, exports.startTemplate(opts));
};
//# sourceMappingURL=cli.js.map