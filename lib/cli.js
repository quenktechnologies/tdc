#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var os = require("os");
var docopt = require("docopt");
var fluture = require("fluture");
var rcl = require("@quenk/rcl");
var jcon = require("@quenk/jcon");
var path_1 = require("path");
var afpl_1 = require("afpl");
/**
 * CompileError
 */
function CompileError(path, e) {
    this.message = "Error while processing " + path + ":" + os.EOL + (e.stack ? e.stack : e.message);
    this.stack = (new Error(this.message)).stack;
    this.name = this.constructor.name;
    if (Error.hasOwnProperty('captureStackTrace'))
        Error.captureStackTrace(this, this.constructor);
}
exports.CompileError = CompileError;
CompileError.prototype = Object.create(Error.prototype);
CompileError.prototype.constructor = CompileError;
exports.default = CompileError;
var expand = function (path, parent) { return path_1.resolve(parent, path); };
var args = docopt.docopt("\n\nUsage:\n  tendril [options] <module>\n\nOptions:\n  -h --help          Show this screen.\n  --modules          Compile modules only.\n  --version          Show version.\n", {
    version: require('../package.json').version
});
var stat = function (path) {
    return fluture.node(function (cb) { return fs.stat(path, cb); });
};
var isDirectory = function (path) {
    return stat(path).chain(function (s) { return fluture.of(afpl_1.Either.fromBoolean(s.isDirectory())); });
};
var isFile = function (path) {
    return stat(path).chain(function (s) { return fluture.of(afpl_1.Either.fromBoolean(s.isFile())); });
};
var readdir = function (path) {
    return fluture.node(function (cb) { return fs.readdir(path, cb); });
};
var readFile = function (path) {
    return fluture.node(function (cb) { return fs.readFile(path, 'utf8', cb); });
};
var writeFile = function (path, contents) {
    return fluture.node(function (cb) { return fs.writeFile(path, contents, cb); });
};
var compile = function (contents, f) {
    return fluture.attempt(function () { return f(contents); });
};
var compileError = function (path, e) {
    return fluture.reject(new CompileError(path, e));
};
var empty = function () { return fluture.of(''); };
var routeFile = function (path) {
    return stat(path)
        .chain(function () { return readFile(path); })
        .chainRej(empty)
        .chain(function (contents) { return compile(contents, rcl.compile); })
        .chainRej(function (e) { return compileError(path, e); });
};
var confFile = function (path) { return function (routes) {
    return stat(path)
        .chain(function () { return readFile(path); })
        .chainRej(empty)
        .chain(function (contents) { return compile(contents, jcon.compile); })
        .chainRej(function (e) { return compileError(path, e); })
        .map(function (conf) {
        return "import * as tendril from '@quenk/tendril';" + os.EOL +
            ("import * as express from 'express';" + os.EOL) +
            ("" + routes + os.EOL + os.EOL) +
            ("export const CONF = " + conf + " " + os.EOL) +
            ("" + os.EOL) +
            "export default (name:string)=>" +
            "new tendril.app.Module(name, __dirname, CONF, routes)";
    });
}; };
var compileModule = function (path) { return routeFile(path + "/routes").chain(confFile(path + "/conf")); };
var compileApp = function (path) {
    return compileModule(path)
        .map(function (txt) { return "" + txt; });
};
var printError = function (e) { return console.error(e.stack ? e.stack : e); };
var noop = function () { };
var execute = function (path) {
    return afpl_1.Either
        .fromBoolean(args['--modules'])
        .map(function () {
        return isDirectory(path)
            .chain(function (e) {
            return e.cata(function () { return fluture.of(undefined); }, function () { return readdir(path)
                .chain(function (list) {
                return fluture
                    .parallel(1, list.map(function (p) { return execute(expand(p, path)); }))
                    .chain(function () { return compileModule(path); })
                    .chain(function (txt) { return writeFile(path + "/index.ts", txt); });
            }); });
        });
    })
        .orRight(function () {
        return compileApp(path)
            .chain(function (txt) { return writeFile(path + "/index.ts", txt); })
            .chain(function () { return writeFile(path + "/start.ts", "import 'source-map-support/register';" + os.EOL +
            ("import * as tendril from '@quenk/tendril';" + os.EOL) +
            ("import createMain from './';" + os.EOL + os.EOL) +
            ("(<any> dotenv).config();" + os.EOL) +
            ("let app = new tendril.app.Application(createMain('/'));" + os.EOL) +
            "app.start();"); });
    })
        .takeRight();
};
execute(expand(args['<module>'], process.cwd())).fork(printError, noop);
//# sourceMappingURL=cli.js.map