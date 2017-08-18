#! /usr/bin/env node
///<reference path='Error.d.ts'/>
///<reference path='docopt.d.ts'/>
import * as fs from 'fs';
import * as os from 'os';
import * as docopt from 'docopt';
import * as fluture from 'fluture';
import * as rcl from '@quenk/rcl';
import * as jcon from '@quenk/jcon';
import { resolve } from 'path';
import { Either} from 'afpl';

/**
 * CompileError
 */
export function CompileError(path:string, e: Error) {

  this.message = `Error while processing ${path}:${os.EOL}${e.stack?e.stack:e.message}`;
  this.stack = (new Error(this.message)).stack;
  this.name = this.constructor.name;

  if (Error.hasOwnProperty('captureStackTrace'))
    Error.captureStackTrace(this, this.constructor);

}

CompileError.prototype = Object.create(Error.prototype);
CompileError.prototype.constructor = CompileError;

export default CompileError

const expand = (path:string, parent: string) => resolve(parent, path);

interface Arguments {

  '--modules': boolean
  '<module>': string

}

const args = docopt.docopt<Arguments>(`

Usage:
  tendril [options] <module>

Options:
  -h --help          Show this screen.
  --modules          Compile modules only.
  --version          Show version.
`, {
        version: require('../package.json').version
    });

const stat = (path:string):fluture.Future<never, fs.Stats> => 
  fluture.node<never, fs.Stats>(cb => fs.stat(path, cb));

const isDirectory = (path:string) : fluture.Future<never, Either<boolean, boolean>>=> 
  stat(path).chain(s=>fluture.of(Either.fromBoolean(s.isDirectory())));

const isFile = (path:string) : fluture.Future<never, Either<boolean, boolean>>=> 
  stat(path).chain(s=>fluture.of(Either.fromBoolean(s.isFile())));

const readdir = (path:string) : fluture.Future<never, string[]> =>
  fluture.node<never, string[]>(cb => fs.readdir(path, cb));

const readFile = (path:string): fluture.Future<never, string> =>
  fluture.node<never, string>(cb=>fs.readFile(path, 'utf8', cb))

const writeFile = (path:string, contents:string): fluture.Future<never, void>=> 
  fluture.node<never, void>(cb=>fs.writeFile(path, contents, cb));

interface Compiler {

  (s:string): string

}

const compile = (contents:string, f:Compiler ) : fluture.Future<never, string>=> 
  fluture.attempt<never, string>(()=>f(contents));

const compileError = (path:string, e:Error) => 
  fluture.reject(new CompileError(path, e));

const empty = () => fluture.of('');

const routeFile = (path:string) => 
  stat(path)
  .chain(()=>readFile(path))
  .chainRej(empty)
  .chain(contents=>compile(contents, rcl.compile))
  .chainRej(e=>compileError(path, e))
  
const confFile = (path:string) => (routes:string) =>
  stat(path)
  .chain(()=>readFile(path))
  .chainRej(empty)
  .chain(contents=>compile(contents, jcon.compile))
  .chainRej(e=>compileError(path, e))
  .map(conf => 

    `import * as tendril from '@quenk/tendril';${os.EOL}`+
    `import * as express from 'express';${os.EOL}`+
    `${routes}${os.EOL}${os.EOL}`+
    `export const CONF = ${conf} ${os.EOL}` +
    `${os.EOL}`+
    `export default (name:string)=>`+
    `new tendril.app.Module(name, __dirname, CONF, routes)`
  
  );

const compileModule = (path:string) =>  routeFile(`${path}/routes`).chain(confFile(`${path}/conf`));

const compileApp = (path:string)=> 
  compileModule(path)
  .map(txt=> `${txt}`);

const printError = (e:Error) => console.error(e.stack?e.stack:e);

const noop = ()=>{}

const execute = (path:string) : fluture.Future<never, void>=> 
    Either
   .fromBoolean(args['--modules'])
   .map(()=>  
       isDirectory(path)
       .chain(e=>
                e.cata(
                  ()=>fluture.of(undefined),
                  ()=> readdir(path)
                        .chain(list=>
                              fluture
                                .parallel(1, list.map(p => execute(expand(p, path))))
                                .chain(()=> compileModule(path))
                                .chain((txt:string)=> writeFile(`${path}/index.ts`, txt))))))
   .orRight(()=>
       compileApp(path)
      .chain((txt:string)=>writeFile(`${path}/index.ts`, txt))
      .chain(()=> writeFile(`${path}/start.ts`,
        `import * as tendril from '@quenk/tendril';${os.EOL}`+
        `import createMain from './';${os.EOL}${os.EOL}`+
        `let app = new tendril.app.Application(createMain('/'));${os.EOL}`+
        `app.start();`
      )))
   .takeRight()
 
execute(expand(args['<module>'], process.cwd())).fork(printError, noop)

