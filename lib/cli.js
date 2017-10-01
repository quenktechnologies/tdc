#! /usr/bin/env node
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var os = require("os");
var docopt = require("docopt");
var rcl = require("@quenk/rcl");
var jcon = require("@quenk/jcon");
var Promise = require("bluebird");
var bluebird_1 = require("bluebird");
var path_1 = require("path");
var afpl_1 = require("afpl");
/**
 * CompileError
 */
var CompileError = /** @class */ (function (_super) {
    __extends(CompileError, _super);
    function CompileError(path, error) {
        var _this = _super.call(this, "Error while processing " + path + ":" + os.EOL + error) || this;
        _this.path = path;
        _this.error = error;
        if (Error.hasOwnProperty('captureStackTrace'))
            Error.captureStackTrace(_this, _this.constructor);
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(_this, Error);
        }
        else {
            _this.__proto__ = Error;
        }
        return _this;
    }
    return CompileError;
}(Error));
exports.CompileError = CompileError;
CompileError.protoype = Object.create(Error.prototype, {
    constructor: {
        value: Error,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
console.error('error ', new CompileError('foo', 'meh') instanceof CompileError);
/**
 * stat wrapper
 */
var stat = function (path) {
    return bluebird_1.fromCallback(function (cb) { return fs.stat(path, cb); });
};
/**
 * isDirectory wrapper.
 */
var isDirectory = function (path) {
    return stat(path)
        .then(function (s) { return Promise.resolve(afpl_1.Either.fromBoolean(s.isDirectory())); })
        .catch(function () { return Promise.resolve(afpl_1.Either.left(false)); });
};
/**
 * isFile wrapper
 */
var isFile = function (path) {
    return stat(path)
        .then(function (s) { return Promise.resolve(afpl_1.Either.fromBoolean(s.isFile())); })
        .catch(function () { return Promise.resolve(afpl_1.Either.left(false)); });
};
/**
 * readdir wrapper
 */
var readdir = function (path) {
    return bluebird_1.fromCallback(function (cb) { return fs.readdir(path, cb); });
};
/**
 * readFile wrapper
 */
var readFile = function (path) {
    return bluebird_1.fromCallback(function (cb) { return fs.readFile(path, 'utf8', cb); });
};
/**
 * writeFile wrapper
 */
var writeFile = function (path, contents) {
    return bluebird_1.fromCallback(function (cb) { return fs.writeFile(path, contents, cb); });
};
/**
 * compile applies a compiler to some contents.
 */
var compile = function (contents, c) {
    return Promise.try(function () { return c(contents); });
};
/**
 * template generates the content of the file.
 */
var template = function (routes, conf) {
    return "import * as tendril from '@quenk/tendril';" + os.EOL +
        ("import * as express from 'express';" + os.EOL) +
        ("" + routes + os.EOL + os.EOL) +
        ("export const conf = ()=>(" + conf + ") " + os.EOL) +
        ("" + os.EOL) +
        "export default (name:string)=>" +
        "new tendril.app.Module(name, __dirname, conf(), routes)";
};
/**
 * startTemplate provides the contant of the start.js file.
 */
var startTemplate = function () {
    return "import 'source-map-support/register';" + os.EOL +
        ("import * as tendril from '@quenk/tendril';" + os.EOL) +
        ("import createMain from './';" + os.EOL + os.EOL) +
        ("let app = new tendril.app.Application(createMain('/'));" + os.EOL) +
        "app.start();";
};
var compileError = function (path, e) {
    return Promise.reject(new CompileError(path, (e.message)));
};
/**
 * routeFile compiles the route file.
 */
var routeFile = function (path) {
    return isFile(path)
        .then(function (e) { return e.cata(function () { return Promise.resolve(''); }, function () {
        return readFile(path).then(function (contents) { return compile(contents, rcl.compile); });
    }); })
        .catch(function (e) { return compileError(path, e); });
};
/**
 * confFile compiles the conf file.
 */
var confFile = function (path) { return function (routes) {
    return isFile(path)
        .then(function (e) { return e.cata(function () { return Promise.resolve(''); }, function () {
        return readFile(path)
            .then(function (contents) {
            return compile(contents, jcon.compile);
        });
    }); })
        .then(function (conf) { return template(routes, conf); })
        .catch(function (e) { return compileError(path, e); });
}; };
var someIsFile = function (paths) {
    return paths
        .reduce(function (p, c) { return p.then(function (e) {
        return e.cata(function () { return isFile(c); }, function () { return Promise.resolve(e); });
    }); }, Promise.resolve(afpl_1.Either.left(false)));
};
var compileModule = function (path) {
    var routes = path + "/routes";
    var conf = path + "/conf";
    return someIsFile([conf, routes])
        .then(function (e) { return e.cata(function () { return Promise.resolve(afpl_1.Either.left('')); }, function () { return routeFile(routes).then(confFile(conf)).then(function (s) { return afpl_1.Either.right(s); }); }); });
};
var printError = function (e) {
    return console.error(e.stack ? e.stack : e);
};
var _readdirs = function (path) { return function (e) {
    return e.cata(function () { return Promise.resolve(afpl_1.Either.left('')); }, function () { return readdir(path).then(_recurse(path)); });
}; };
var _recurse = function (path) { return function (list) {
    return Promise
        .all(list.map(function (p) { return console.error('resolve ', p, path, path_1.resolve(path, p)) || execute(path_1.resolve(path, p)); }))
        .then(function () { return compileModule(path); }).then(_writeModule(path));
}; };
var _writeModule = function (path) { return function (e) {
    return e.cata(function () { return Promise.resolve(''); }, function (txt) { return writeFile(path + "/index.ts", txt); });
}; };
var _writeStart = function (path) { return function (txt) {
    return writeFile(path + "/index.ts", txt)
        .then(function () { return writeFile(path + "/start.ts", startTemplate()); });
}; };
/**
 * execute the program.
 */
var execute = function (path) {
    return console.error('execute---> ', path) ||
        afpl_1.Either
            .fromBoolean(args['--modules'])
            .map(function () {
            return isDirectory(path)
                .then(_readdirs(path));
        })
            .orRight(function () {
            return compileModule(path)
                .then(function (e) { return e.cata(function () { return Promise.resolve(); }, _writeStart(path)); });
        })
            .takeRight();
};
var args = docopt.docopt("\n\nUsage:\n  tendril [options] <module>\n\nOptions:\n  -h --help          Show this screen.\n  --modules          Compile modules only.\n  --version          Show version.\n", {
    version: require('../package.json').version
});
execute(path_1.resolve(process.cwd(), args['<module>']))
    .catch(printError);
//# sourceMappingURL=cli.js.map