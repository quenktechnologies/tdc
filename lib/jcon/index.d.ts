import * as ast from '@quenk/jcon/lib/ast';
import { Future } from '@quenk/noni/lib/control/monad/future';
import { Path } from '@quenk/noni/lib/io/file';
import { Context, Loader } from './context';
/**
 * SourceText source.
 */
export declare type SourceText = string;
/**
 * Code output.
 */
export declare type Code = string;
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
 * newContext creates a new compilation context.
 */
export declare const newContext: (path: Path, loader: Loader) => Context;
/**
 * parse jcon source text into an Abstract Syntax Tree (AST).
 *
 * The [[ast.File|File]] node is always the root node of the AST.
 */
export declare const parse: (src: SourceText) => Future<ast.File>;
/**
 * compile a parsed file into TypeScript code.
 */
export declare const compile: (ctx: Context, file: ast.File) => Future<Code>;
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
 * file2TS converts the body of a parsed file into code.
 *
 * Note: This only outputs the object, not the surronding imports and preamble.
 */
export declare const file2TS: (ctx: Context, f: ast.File) => Code;
/**
 * value2TS transforms one of the valid value nodes into a TypeScript string.
 */
export declare const value2TS: (ctx: Context, n: ast.Value) => Code;
