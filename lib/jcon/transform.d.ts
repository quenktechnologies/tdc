import * as ast from '@quenk/jcon/lib/ast';
import { Future } from '@quenk/noni/lib/control/monad/future';
import { Context } from './context';
/**
 * ensureID ensures a parsed conf file has an id.
 *
 * If there is no id property at the root level then the passed defaultID
 * will be used.
 */
export declare const ensureID: (f: ast.File, id: string) => ast.File;
/**
 * flattenDirectives loads the directives of all the includes and makes them
 * available to the root File.
 */
export declare const flattenDirectives: (ctx: Context, f: ast.File) => Future<ast.File>;
/**
 * transformTree applies all the transforms to the AST in one go.
 */
export declare const transformTree: (ctx: Context, f: ast.File) => Future<ast.File>;
