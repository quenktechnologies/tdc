#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var docopt = require("docopt");
var function_1 = require("@quenk/noni/lib/data/function");
var cli_1 = require("./cli");
var path_1 = require("path");
var BIN = path_1.basename(__filename);
var opts = cli_1.args2Opts(docopt.docopt("\n\nUsage:\n  " + BIN + " [options] [--no-recurse] [--no-start] [--ignore=PATH...] <module>\n  " + BIN + " [options] [--no-recurse] [--no-start] [--ignore=PATH...]\n         --main PATH <module>\n\nOptions:\n  -h --help          Show this screen.\n  --no-recurse       Disable recursive module generation.\n  --no-start         Disable writing a start file at the root level.\n  --ignore PATH      Ignore paths that match this expression.\n  --main PATH        Path to the class that will be used as the app. Must be\n                     in the format <module>#<export>.\n  --version          Show version.\n", {
    version: require('../package.json').version
}));
var expand = function (cwd, path) { return path_1.isAbsolute(path) ?
    path :
    path_1.join(cwd, path); };
var main = function () { return cli_1.exec(expand(process.cwd(), opts.module), opts)
    .fork(function (e) { return console.error("Error occured: " + e.message); }, function_1.noop); };
main();
//# sourceMappingURL=main.js.map