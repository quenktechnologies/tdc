import * as ast from '@quenk/jcon/lib/ast';
import { Future } from "@quenk/noni/lib/control/monad/future";
import { Context } from './context';
/**
 * getAllDirectives provides the directives of a File (and all included files).
 */
export declare const getAllDirectives: (ctx: Context, f: ast.File) => Future<ast.Directive[]>;
