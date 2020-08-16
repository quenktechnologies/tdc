import * as ast from '@quenk/jcon/lib/ast';
import { Future } from '@quenk/noni/lib/control/monad/future';
import { Context } from './context';
/**
 * addProperties adds special properties useful for module configuration.
 *
 * Currently these are:
 *
 * 1. id (uses the module basename if not provided)
 * 2. app.dirs.self
 */
export declare const addProperties: (ctx: Context, f: ast.File) => ast.File;
/**
 * flattenDirectives loads the directives of all the includes and makes them
 * available to the root File.
 */
export declare const flattenDirectives: (ctx: Context, f: ast.File) => Future<ast.File>;
/**
 * transformTree applies all the transforms to the AST in one go.
 */
export declare const transformTree: (ctx: Context, f: ast.File) => Future<ast.File>;
