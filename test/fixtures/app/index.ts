import * as express from 'express'; 
import * as bodyParser from 'body-parser'; 
import * as r from './modules/r'; 
[object Object]
{'create': (a:App) => new Module(a),
'app': {'middleware': {'available': { public: { module: express.static('${__dirname}/public',{ maxAge: 0 }) },
json: { module: bodyParser.json },
urlencoded: { module: bodyParser.urlencoded } },
'enabled': ['public','json','urlencoded']},
'modules': { r: r.default },
'routes': (m:Module) => {

m.install('get','/',[index].concat([]));
m.install('get','/login',[showLoginForm].concat([]));
m.install('post','/login',[authenticate].concat([]));
m.install('get','/logout',[logout].concat([]));

}}}