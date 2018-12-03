#! /usr/bin/env node
import * as docopt from 'docopt';
import { Path } from '@quenk/noni/lib/io/file';
import { noop } from '@quenk/noni/lib/data/function';
import { Arguments, exec, args2Opts } from './cli';
import { basename, isAbsolute, join } from 'path';

const BIN = basename(__filename);

const opts = args2Opts(docopt.docopt<Arguments>(`

Usage:
  ${BIN} [options] [--no-recurse] [--no-start] [--ignore=PATH...] <module>

Options:
  -h --help          Show this screen.
  --no-recurse       Disable recursive module generation.
  --no-start         Disable writing a start file at the root level.
  --ignore PATH      Ignore paths that match this expression.
  --version          Show version.
`, {
        version: require('../package.json').version
    }));

const expand = (cwd: Path, path: Path) => isAbsolute(path) ?
    path :
    join(cwd, path);

const main = () => exec(expand(process.cwd(), opts.module), opts)
    .fork(e => console.error(`Error occured: ${e.message}`), noop);

main();
