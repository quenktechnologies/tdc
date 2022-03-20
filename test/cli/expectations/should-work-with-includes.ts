import * as orgControllers from '@org/controllers'; 
//@ts-ignore: 6133
import {System} from '@quenk/potoo/lib/actor/system';
//@ts-ignore: 6133
import * as _json from '@quenk/noni/lib/data/jsonx';
//@ts-ignore: 6133
import {Template} from '@quenk/tendril/lib/app/module/template';
//@ts-ignore: 6133
import {Module} from '@quenk/tendril/lib/app/module';
//@ts-ignore: 6133
import {Request} from '@quenk/tendril/lib/app/api/request;'
//@ts-ignore: 6133
import {RouteConf as $RouteConf} from '@quenk/tendril/lib/app/module';
import {App as App} from '@quenk/tendril/lib/app';


,//@ts-ignore: 6133
export const template = ($app: App): Template => (
 {'id': `should-work-with-includes`,
'app': {'dirs': {'self': `/test/cli/tests/should-work-with-includes`},
'routes': //@ts-ignore: 6133
($module:Module) => {

let $routes:$RouteConf[] = [];

$routes.push({
method:'get',
path:'/',
filters:[$module.show(`index.html`, {})],{}});
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

                 return ctl.serveData.call(ctl, [`r`]);
        }],{}});

$routes.push({
method:'delete',
path:'/',
filters:[$module.show(`404.html`, {})],{}});
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

                 return ctl.saveData.call(ctl, [`r`]);
        }],{}});
return $routes;
}},
'create': 
//@ts-ignore: 6133 
(s:System) => new Module(<App>s)})