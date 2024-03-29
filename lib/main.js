#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docopt = require("docopt");
const path_1 = require("path");
const cli_1 = require("./cli");
const BIN = (0, path_1.basename)(__filename);
const opts = (0, cli_1.args2Opts)(docopt.docopt(`

Usage:
  ${BIN} [options] [--no-recurse] [--no-start] [--ignore=PATH...]
         [--root-dir=PATH] <module>
  ${BIN} [options] [--no-recurse] [--no-start] [--ignore=PATH...]
         --main PATH <module>

Options:
  -h --help          Show this screen.
  --no-recurse       Disable recursive module generation.
  --no-start         Disable writing a start file at the root level.
  --ignore PATH      Ignore paths that match this expression.
  --main PATH        Path to the class that will be used as the app. Must be
                     in the format <module>#<export>.
  --root-dir PATH    The path to treat as the root of the project. Defaults to
                     the current working directory.
  --version          Show version.
`, {
    version: require('../package.json').version
}));
const expand = (cwd, path) => (0, path_1.isAbsolute)(path) ?
    path :
    (0, path_1.join)(cwd, path);
const main = () => {
    (0, cli_1.exec)(expand(process.cwd(), opts.module), opts)
        .fork(e => {
        console.error(`Error occured: ${e.message}`);
        process.exit(1);
    });
};
main();
//# sourceMappingURL=main.js.map