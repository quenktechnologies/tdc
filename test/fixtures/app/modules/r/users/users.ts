import {Future, pure} from '@quenk/noni/lib/control/monad/future';
import {ok, created} from '@quenk/tendril/lib/app/api/http';

export const get = ()=> pure(ok());

export const post = ()=> pure(created());

export const patch = ()=> pure(ok());
