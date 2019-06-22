import * as jconAst from '@quenk/jcon/lib/ast';
import * as rclAst from '@quenk/rcl/lib/ast';
import { Future } from '@quenk/noni/lib/control/monad/future';
export declare const FILE_CONF = "conf";
export declare const FILE_ROUTE = "routes";
export declare const FILE_INDEX = "index.ts";
export declare const FILE_START = "start.ts";
export declare const DEFAULT_MAIN = "@quenk/tendrill/lib/app#App";
export interface Arguments {
    '<module>': string;
    '--no-recurse': boolean;
    '--no-start': boolean;
    '--ignore': string[];
    '--main': string;
}
export interface Options {
    module: string;
    noRecurse: boolean;
    noStart: boolean;
    ignore: RegExp[];
    main: string;
}
/**
 * args2Opts function.
 */
export declare const args2Opts: (args: Arguments) => Options;
/**
 * startTemplate provides the contant of the start.js file.
 */
export declare const startTemplate: (opts: Options) => string;
/**
 * isModule test.
 *
 * A directory is a module if it has a conf or routes file or both.
 */
export declare const isModule: (path: string) => Future<boolean>;
/**
 * exec the program.
 */
export declare const exec: (path: string, opts: Options) => Future<void>;
export declare const getTDCFiles: (path: string) => Future<[jconAst.File, rclAst.File]>;
/**
 * execR executes recursively on a path.
 *
 * All directories under the given path will be checked for
 * TDC files, if any are found they will be turned into modules.
 */
export declare const execR: (path: string, opts: Options) => Future<void[]>;
/**
 * writeIndexFile writes out compile typescript to
 * the index file of a path.
 */
export declare const writeIndexFile: (path: string, ts: string) => Future<void>;
/**
 * writeStartFile writes out the start script to a destination/
 */
export declare const writeStartFile: (path: string, opts: Options) => Future<void>;
