import * as ast from '@quenk/jcon/lib/ast';
import { Future } from '@quenk/noni/lib/control/monad/future';
import { Path } from '@quenk/noni/lib/io/file';
/**
 * SourceText source.
 */
export declare type SourceText = string;
/**
 * Code output.
 */
export declare type Code = string;
/**
 * Loader loads the parsed contents of a JCON file
 * into memory.
 */
export declare type Loader = (path: string) => Future<string>;
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
 * CodeStruct holds the Code for the final output of compilation in a structure
 * that preserves the nesting of the properties.
 */
export interface CodeStruct {
    [key: string]: Code | CodeStruct;
}
/**
 * newContext constructor function.
 */
export declare const newContext: (loader: Loader) => Context;
/**
 * parse jcon source text into an Abstract Syntax Tree (AST).
 *
 * The [[ast.File|File]] node is always the root node of the AST.
 */
export declare const parse: (src: SourceText) => Future<ast.File>;
/**
 * compile some an AST into the TypeScript code.
 */
export declare const compile: (ctx: Context, file: ast.File) => Future<Code>;
/**
 * getAllDirectives provides the directives of a File (and all included files).
 */
export declare const getAllDirectives: (ctx: Context, f: ast.File) => Future<ast.Directive[]>;
/**
 * parseJCONFile at the specified path.
 *
 * A [[ast.File]] node is returned on success.
 */
export declare const parseJCONFile: (ctx: Context, path: Path) => Future<ast.File>;
/**
 * flattenCodeStruct converts a Record of Code strings into
 * a single string representing the record in TypeScript output.
 */
export declare const flattenCodeStruct: (ctx: Context, rec: CodeStruct) => Code;
/**
 * wrapDirectives in the import preamble and associated export statement.
 *
 * This function makes the generated TypeScript ready for use.
 */
export declare const wrapDirectives: (ctx: Context, dirs: ast.Directive[], code: Code) => Code;
/**
 * getAllImports provides a Record containing all the imports (via module
 * pointer syntax) found in the list of directives provided.
 */
export declare const getAllImports: (dirs: ast.Directive[]) => Imports;
/**
 * flattenImports into a TypeScript string.
 */
export declare const flattenImports: (ctx: Context, i: Imports) => Code;
/**
 * value2TS transforms one of the valid value nodes into a TypeScript string.
 */
export declare const value2TS: (ctx: Context, n: ast.Value) => Code;
