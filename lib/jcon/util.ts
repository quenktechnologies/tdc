import * as ast from '@quenk/jcon/lib/ast';

import { 
  Future,
  pure,
  doFuture,
  sequential 
} from "@quenk/noni/lib/control/monad/future";
import { Context } from './context';
import { parseJCONFile } from '.';

/**
 * getAllDirectives provides the directives of a File (and all included files).
 */
export const getAllDirectives =
    (ctx: Context, f: ast.File): Future<ast.Directive[]> =>
        doFuture(function*() {

            let work = f.includes.map(i => doFuture(function*() {

                let { path } = i;

                let file = yield parseJCONFile(ctx, path.value);

                let childDirectives = yield getAllDirectives(ctx, file);

                return pure([...childDirectives, ...file.directives]);

            }));

            let results: ast.Directive[][] = yield sequential(work);

            let flatResults =
                results.reduce((p, c) => p.concat(c), <ast.Directive[]>[]);

            return pure([...flatResults, ...f.directives]);

        });
