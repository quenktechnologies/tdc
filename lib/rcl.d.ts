import * as ast from '@quenk/rcl/lib/ast';
import { Future } from '@quenk/noni/lib/control/monad/future';
import { Code } from './common/output';
import { Imports } from './common/imports';
/**
 * Loader loads the parsed contents of a RCL file
 * into memory.
 */
export declare type Loader = (path: string) => Future<string>;
/**
 * Parser turns a text string into a File node.
 */
export declare type Parser = (src: string) => Future<ast.File>;
/**
 * Context compilation takes place in.
 */
export interface Context {
    /**
     * locals is a list of variable names found in the compiled source.
     */
    locals: string[];
    /**
     * loader configured
     */
    loader: Loader;
    /**
     * rcl parser configured for the Context.
     */
    rcl: Parser;
}
/**
 * newContext constructor function.
 */
export declare const newContext: (loader: Loader) => Context;
/**
 * parse source text into an rcl File node.
 */
export declare const parse: (src: string) => Future<ast.File>;
/**
 * compile some source text into Code code.
 */
export declare const compile: (src: string, ctx: Context) => Future<Code>;
/**
 * getAllImports provides an Imports object containing all the imports found
 * in a file based on detected module pointer syntax usage.
 */
export declare const getAllImports: (file: ast.File) => Imports;
/**
 * file2TS transforms a file into a function for installing
 * routes.
 *
 * This writes only the function and not imports.
 */
export declare const file2TS: (ctx: Context, node: ast.File) => Future<Code>;
/**
 * resolveIncludes found in a File node.
 *
 * This merges the contents of each [[ast.Include]] found into the passed
 * [[ast.File]].
 */
export declare const resolveIncludes: (ctx: Context, node: ast.File) => Future<ast.File>;
