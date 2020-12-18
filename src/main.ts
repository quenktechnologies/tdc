#! /usr/bin/env node
import * as docopt from 'docopt';
import { Path } from '@quenk/noni/lib/io/file';
import { noop } from '@quenk/noni/lib/data/function';
import { Arguments, exec, args2Opts } from './cli';
import { basename, isAbsolute, join } from 'path';

const BIN = basename(__filename);

const opts = args2Opts(docopt.docopt<Arguments>(`

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

const expand = (cwd: Path, path: Path) => isAbsolute(path) ?
    path :
    join(cwd, path);

const main = () => {

    exec(expand(process.cwd(), opts.module), opts)
        .catch(e => {

            console.error(`Error occured: ${e.message}`);
            process.exit(1);

        })
        .fork();

}

    main();
