
//@ts-ignore: 6133
import * as _json from '@quenk/noni/lib/data/jsonx';
//@ts-ignore: 6133
import {Template} from '@quenk/tendril/lib/app/module/template';
//@ts-ignore: 6133
import {Module} from '@quenk/tendril/lib/app/module';
//@ts-ignore: 6133
import {Request} from '@quenk/tendril/lib/app/api/request;'
import {App as App} from '@quenk/tendril/lib/app';



export const template = (_app: App): Template<App> => (
 {'id': `route-with-view`,
'app': {'dirs': {'self': `/test/cli/tests/route-with-view`},
'routes': (_m:Module) => {

let $routes = [];

$routes.push({
method:'get',
path:'/',
filters:[_m.show(`index.html`, {})]});

$routes.push({
method:'get',
path:'/:id',
filters:[_m.show(`user.html`, {id: $params.id })]});

$routes.push({
method:'delete',
path:'/:id',
filters:[ensureAuth_m.show(`delete.html`, {id: $params.id })]});
return $routes;
}},
'create': 
//@ts-ignore: 6133 
(_app:App) => new Module(_app)})