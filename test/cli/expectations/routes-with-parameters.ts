import * as dotHandlers from './handlers'; 
import * as orgModuleHandlers from '@org/module/handlers'; 
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
 {'id': `routes-with-parameters`,
'app': {'dirs': {'self': `/test/cli/tests/routes-with-parameters`},
'routes': (_m:Module) => {

let $routes = [];

$routes.push({
method:'get',
path:'/',
filters:[// @ts-ignore: 6133
                ($request: Request)=> {

                  // @ts-ignore: 6133
                 let $params:_json.Object = $request.params || {};
                 // @ts-ignore: 6133
                 let $query: _json.Object = $request.query || {};
                 //@ts-ignore: 6133
                 let $body = _json.Value = $request.body;

                 return dotHandlers.index(`posts`);
        }]});

$routes.push({
method:'get',
path:'/:id',
filters:[// @ts-ignore: 6133
                ($request: Request)=> {

                  // @ts-ignore: 6133
                 let $params:_json.Object = $request.params || {};
                 // @ts-ignore: 6133
                 let $query: _json.Object = $request.query || {};
                 //@ts-ignore: 6133
                 let $body = _json.Value = $request.body;

                 return orgModuleHandlers.post($id);
        }]});
return $routes;
}},
'create': 
//@ts-ignore: 6133 
(_app:App) => new Module(_app)})