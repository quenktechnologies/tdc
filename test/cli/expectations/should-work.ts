import * as dot from './'; 
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
 {'id': `/`,
'app': {'dirs': {'self': `/test/cli/tests/should-work`},
'routes': (_m:Module) => {

let $routes = [];

$routes.push({
method:'get',
path:'/',
filters:[dot.showPosts]});

$routes.push({
method:'get',
path:'/post',
filters:[dot.showPostJobPage]});

$routes.push({
method:'post',
path:'/post',
filters:[dot.createPost]});

$routes.push({
method:'get',
path:'/posts/:id',
filters:[dot.showPost]});
return $routes;
}},
'create': 
//@ts-ignore: 6133 
(_app:App) => new Module(_app),
'server': {'port': (<string>process.env['PORT']),
'host': `0.0.0.0`}})