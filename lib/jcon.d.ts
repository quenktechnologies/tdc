import * as ast from '@quenk/jcon/lib/ast';
import { Future } from '@quenk/noni/lib/control/monad/future';
/**
 * Text source.
 */
export declare type Text = string;
/**
 * TypeScript output.
 */
export declare type TypeScript = string;
/**
 * Loader loads the parsed contents of a JCON file
 * into memory.
 */
export declare type Loader = (path: string) => Future<string>;
/**
 * Parser turns a text string into a File node.
 */
export declare type Parser = (src: Text) => Future<ast.File>;
/**
 * CandidateTypeScriptT
 */
export declare type CandidateTypeScript = TypeScript | CandidateTypeScripts;
/**
 * Context the jcon file is complied in.
 */
export interface Context {
    /**
     * loader configured for the Context.
     *
     * All paths are passed as encountered.
     */
    loader: Loader;
    /**
     * jcon parser configured for the Context.
     */
    jcon: Parser;
    /**
     * tendril import module path.
     */
    tendril: string;
    /**
     * EOL marker to use during compilation.
     */
    EOL: string;
}
/**
 * Imports map.
 */
export interface Imports {
    [key: string]: string;
}
/**
 * PotentialOutput
 */
export interface CandidateTypeScripts {
    [key: string]: CandidateTypeScript;
}
/**
 * newContext constructor function.
 */
export declare const newContext: (loader: Loader) => Context;
/**
 * file2TS transforms a File node into TypeScript.
 */
export declare const file2TS: (ctx: Context, f: ast.File) => Future<string>;
/**
 * value2TS transforms one of the Value nodes into its TypeScript
 * equivelant.
 */
export declare const value2TS: (n: ast.Value) => string;
/**
 * file2Imports extracts a list of TypeScript imports from a File node.
 */
export declare const file2Imports: (ctx: Context, f: ast.File) => string;
/**
 * parse source text into a File node.
 */
export declare const parse: (src: string) => Future<ast.File>;
/**
 * compile some source text into TypeScript code.
 */
export declare const compile: (src: string, ctx: Context) => Future<string>;
