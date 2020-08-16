import * as ast from '@quenk/jcon/lib/ast';

import { basename } from 'path';

import { Future, pure, doFuture } from '@quenk/noni/lib/control/monad/future';

import { Context } from './context';
import { getAllDirectives } from './util';

/**
 * addProperties adds special properties useful for module configuration.
 *
 * Currently these are:
 *
 * 1. id (uses the module basename if not provided)
 * 2. app.dirs.self
 */
export const addProperties = (ctx: Context, f: ast.File): ast.File => {

    let hasId = f.directives.some(p => (p instanceof ast.Property) &&
        (p.path[0].value === 'id'));

    return hasId ? f : new ast.File(
        f.includes,
        [
            new ast.Property(
                [new ast.Identifier('id', {})],
                new ast.StringLiteral(basename(ctx.path), {}),
                {}),
            new ast.Property(
                [
                    new ast.Identifier('app', {}),
                    new ast.Identifier('dirs', {}),
                    new ast.Identifier('self', {})
                ],
                new ast.StringLiteral(ctx.path, {}),
                {}),

            ...f.directives
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

        return pure( addProperties(ctx, file));

    });
