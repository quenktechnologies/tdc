import * as ast from '@quenk/rcl/lib/ast';
import { Future } from '@quenk/noni/lib/control/monad/future';
/**
 * TypeScript output.
 */
export declare type TypeScript = string;
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
 * Imports map.
 */
export interface Imports {
    [key: string]: string | string[];
}
/**
 * Context compilation takes place in.
 */
export interface Context {
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
 * file2Imports extracts the imports for a File
 */
export declare const file2Imports: (f: ast.File) => Imports;
/**
 * imports2TS converts a map of imports to
 * the relevant TypeScript import blocks.
 */
export declare const imports2TS: (i: Imports) => TypeScript;
/**
 * file2TS transforms a file into a function for installing
 * routes.
 *
 * This writes only the function and not imports.
 */
export declare const file2TS: (ctx: Context, f: ast.File) => Future<TypeScript>;
/**
 * parse source text into an rcl File node.
 */
export declare const parse: (src: string) => Future<ast.File>;
/**
 * compile some source text into TypeScript code.
 */
export declare const compile: (src: string, ctx: Context) => Future<TypeScript>;
