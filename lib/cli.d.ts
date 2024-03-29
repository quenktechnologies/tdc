import * as jconAst from '@quenk/jcon/lib/ast';
import * as rclAst from '@quenk/rcl/lib/ast';
import { Path } from '@quenk/noni/lib/io/file';
import { Future } from '@quenk/noni/lib/control/monad/future';
export declare const FILE_CONF = "conf";
export declare const FILE_ROUTE = "routes";
export declare const FILE_INDEX = "index.ts";
export declare const FILE_START = "start.ts";
export declare const DEFAULT_MAIN = "@quenk/tendril/lib/app#App";
export declare const TDC_MERGE_IMPORTS: RegExp;
export declare const TDC_MERGE_EXPORTS: RegExp;
type ParsedFiles = [JCONFile, RCLFile];
type TypeScript = string;
type JCONFile = jconAst.File;
type RCLFile = rclAst.File;
export interface Arguments {
    '<module>': string;
    '--no-recurse': boolean;
    '--no-start': boolean;
    '--ignore': string[];
    '--main': string;
    '--root-dir': string;
}
export interface Options {
    module: string;
    noRecurse: boolean;
    noStart: boolean;
    ignore: RegExp[];
    main: string;
    rootDir: string;
}
/**
 * args2Opts function.
 */
export declare const args2Opts: (args: Arguments) => Options;
/**
 * startTemplate provides the contant of the start.js file.
 */
export declare const startTemplate: (opts: Options) => [TypeScript, TypeScript];
/**
 * isModule tests whether a directory is a module or not.
 *
 * A directory is a module if it has either a conf or routes file or both.
 */
export declare const isModule: (path: Path) => Future<boolean>;
/**
 * exec the program.
 */
export declare const exec: (path: Path, opts: Options) => Future<void>;
/**
 * getFiles provides the parsed conf file and routes file.
 *
 * If they don't exist, an empty string is passed to the relevant parser.
 */
export declare const getTDCFiles: (path: Path) => Future<ParsedFiles>;
/**
 * @private
 */
export declare const compile: ([conf, routes]: ParsedFiles, opts: Options, path: Path) => Future<[string, string]>;
/**
 * execR executes recursively on a path.
 *
 * All directories under the given path will be checked for
 * TDC files, if any are found they will be turned into modules.
 */
export declare const execR: (path: Path, opts: Options) => Future<void[]>;
/**
 * writeIndexFile writes out compiled typescript to the index file of a path.
 *
 * If the file already exists we attempt to merge it with the output via
 * the TDC_MERGE_COMMENT
 */
export declare const writeIndexFile: (path: Path, ts: [TypeScript, TypeScript]) => Future<void>;
/**
 * writeStartFile writes out the start script to a destination/
 */
export declare const writeStartFile: (path: Path, opts: Options) => Future<void>;
export {};
