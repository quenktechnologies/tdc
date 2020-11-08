import * as orgControllers from '@org/controllers'; 
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
 {'id': `should-work-with-includes`,
'app': {'dirs': {'self': `/test/cli/tests/should-work-with-includes`},
'routes': ($module:Module) => {

let $routes = [];

$routes.push({
method:'get',
path:'/',
filters:[$module.show(`index.html`, {})]});
let ctl = new orgControllers.User(`bar`);

$routes.push({
method:'get',
path:'/r',
filters:[// @ts-ignore: 6133
                ($request: Request)=> {

                  // @ts-ignore: 6133
                 let $params:_json.Object = $request.params || {};
                 // @ts-ignore: 6133
                 let $query: _json.Object = $request.query || {};
                 //@ts-ignore: 6133
                 let $body = _json.Value = $request.body;

                 return ctl.serveData(`r`);
        }]});

$routes.push({
method:'delete',
path:'/',
filters:[$module.show(`404.html`, {})]});
ctl = new orgControllers.Admin(`foo`);

$routes.push({
method:'post',
path:'/r',
filters:[// @ts-ignore: 6133
                ($request: Request)=> {

                  // @ts-ignore: 6133
                 let $params:_json.Object = $request.params || {};
                 // @ts-ignore: 6133
                 let $query: _json.Object = $request.query || {};
                 //@ts-ignore: 6133
                 let $body = _json.Value = $request.body;

                 return ctl.saveData(`r`);
        }]});
return $routes;
}},
'create': 
//@ts-ignore: 6133 
(_app:App) => new Module(_app)})
