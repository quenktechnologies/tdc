import { Future, pure } from '@quenk/noni/lib/control/monad/future';
import { Request, ActionM } from '@quenk/tendril/lib/app/api';
import { ok } from '@quenk/tendril/lib/app/api/http';

export const index = (_: Request): Future<ActionM<undefined>> =>
    pure(ok());

export const showLoginForm = (_: Request): Future<ActionM<undefined>> =>
    pure(ok());

export const authenticate = (_: Request): Future<ActionM<undefined>> =>
    pure(ok());

export const logout = (_: Request): Future < ActionM < undefined >> =>
pure(ok());
