import * as ast from '@quenk/jcon/lib/ast';

import { basename } from 'path';

import { Future, pure, doFuture } from '@quenk/noni/lib/control/monad/future';

import { Context } from './context';
import { getAllDirectives } from './util';

/**
 * ensureID ensures a parsed conf file has an id.
 *
 * If there is no id property at the root level then the passed defaultID
 * will be used.
 */
export const ensureID = (f: ast.File, id: string): ast.File => {

    let hasId = f.directives.some(p => (p instanceof ast.Property) &&
        (p.path[0].value === 'id'));

    return hasId ? f : new ast.File(
        f.includes,
        [
            new ast.Property(
                [new ast.Identifier('id', {})],
                new ast.StringLiteral(id, {}),
                {}),
            ...f.directives,
        ],
        {});

}

/**
 * flattenDirectives loads the directives of all the includes and makes them
 * available to the root File.
 */
export const flattenDirectives =
    (ctx: Context, f: ast.File): Future<ast.File> =>
        doFuture<ast.File>(function*() {

            let dirs = yield getAllDirectives(ctx, f);

            return pure(new ast.File(f.includes, dirs, f.location));

        });

/**
 * transformTree applies all the transforms to the AST in one go.
 */
export const transformTree = (ctx: Context, f: ast.File): Future<ast.File> =>
    doFuture<ast.File>(function*() {

        let file = yield flattenDirectives(ctx, f);

        return pure(ensureID(file, basename(ctx.path)));

    });
