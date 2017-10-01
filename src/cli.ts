#! /usr/bin/env node
///<reference path='Error.d.ts'/>
///<reference path='docopt.d.ts'/>
import * as fs from 'fs';
import * as os from 'os';
import * as docopt from 'docopt';
import * as rcl from '@quenk/rcl';
import * as jcon from '@quenk/jcon';
import * as Promise from 'bluebird';
import { fromCallback as node } from 'bluebird';
import { resolve } from 'path';
import { Either } from 'afpl';

export interface Arguments {

    '--modules': boolean
    '<module>': string

}

export interface Compiler {

    (s: string): string

}

/**
 * CompileError
 */
export class CompileError extends Error {

    constructor(public path: string, public error: string) {

        super(`Error while processing ${path}:${os.EOL}${error}`);

        if (Error.hasOwnProperty('captureStackTrace'))
            Error.captureStackTrace(this, this.constructor);

        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, Error);
        } else {
            (<any>this).__proto__ = Error;
        }


    }

}

/**
 * stat wrapper
 */
const stat = (path: string) =>
    node(cb => fs.stat(path, cb));

/**
 * isDirectory wrapper.
 */
const isDirectory = (path: string) =>
    stat(path)
        .then(s => Promise.resolve(Either.fromBoolean(s.isDirectory())))
        .catch(() => Promise.resolve(Either.left<boolean, boolean>(false)));

/**
 * isFile wrapper
 */
const isFile = (path: string) =>
    stat(path)
        .then(s => Promise.resolve(Either.fromBoolean(s.isFile())))
        .catch(() => Promise.resolve(Either.left<boolean, boolean>(false)));

/**
 * readdir wrapper
 */
const readdir = (path: string) =>
    node(cb => fs.readdir(path, cb));

/**
 * readFile wrapper
 */
const readFile = (path: string) =>
    node(cb => fs.readFile(path, 'utf8', cb));

/**
 * writeFile wrapper
 */
const writeFile = (path: string, contents: string) =>
    node(cb => fs.writeFile(path, contents, cb));

/**
 * compile applies a compiler to some contents.
 */
const compile = (contents: string, c: Compiler) =>
    Promise.try(() => c(contents));

/**
 * template generates the content of the file.
 */
const template = (routes: string, conf: string) =>
    `import * as tendril from '@quenk/tendril';${os.EOL}` +
    `import * as express from 'express';${os.EOL}` +
    `${routes}${os.EOL}${os.EOL}` +
    `export const conf = ()=>(${conf}) ${os.EOL}` +
    `${os.EOL}` +
    `export default (name:string)=>` +
    `new tendril.app.Module(name, __dirname, conf(), routes)`;

/**
 * startTemplate provides the contant of the start.js file.
 */
const startTemplate = () =>
    `import 'source-map-support/register';${os.EOL}` +
    `import * as tendril from '@quenk/tendril';${os.EOL}` +
    `import createMain from './';${os.EOL}${os.EOL}` +
    `let app = new tendril.app.Application(createMain('/'));${os.EOL}` +
    `app.start();`

const compileError = (path: string, e: Error) =>
    Promise.reject(new CompileError(path, (e.message)));

/**
 * routeFile compiles the route file.
 */
const routeFile = (path: string): Promise<string> =>
    isFile(path)
        .then(e => e.cata(() => compile('', rcl.compile), () =>
            readFile(path).then(contents => compile(contents, rcl.compile))))
        .catch(e => compileError(path, e));

/**
 * confFile compiles the conf file.
 */
const confFile = (path: string) => (routes: string) =>
    isFile(path)
        .then(e => e.cata(() => Promise.resolve('{}'), () =>
            readFile(path)
                .then(contents =>
                    compile(contents, jcon.compile))))
        .then(conf => template(routes, conf))
        .catch(e => compileError(path, e));

const someIsFile = (paths: string[]) =>
    paths
        .reduce((p, c) => p.then(e =>
            e.cata(() => isFile(c), () => Promise.resolve(e))),
        Promise.resolve(Either.left<boolean, boolean>(false)));

const compileModule = (path: string) => {

    let routes = `${path}/routes`;
    let conf = `${path}/conf`;

    return someIsFile([conf, routes])
        .then(e => e.cata<Promise<Either<string, string>>>(
            () => Promise.resolve(Either.left<string, string>('')),
            () => routeFile(routes).then(confFile(conf)).then((s: string) => Either.right<string, string>(s))));

}

const printError = (e: Error) =>
    console.error(e.stack ? e.stack : e);

const _readdirs = (path: string) => (e: Either<boolean, boolean>): Promise<Either<any, string>> =>
    e.cata(() => Promise.resolve(Either.left<string, string>('')), () => readdir(path).then(_recurse(path)));

const _recurse = (path: string) => (list: string[]): Promise<Either<any, string>> =>
    Promise
        .all(list.map((p: string) => execute(resolve(path, p))))
        .then(() => compileModule(path)).then(_writeModule(path));

const _writeModule = (path: string) => (e: Either<any, string>) =>
    e.cata(() => Promise.resolve(''), (txt: string) => writeFile(`${path}/index.ts`, txt));

const _writeStart = (path: string) => (txt: string) =>
    writeFile(`${path}/index.ts`, txt)
        .then(() => writeFile(`${path}/start.ts`, startTemplate()));

/**
 * execute the program.
 */
const execute = (path: string) =>
    Either
        .fromBoolean(args['--modules'])
        .map(() =>
            isDirectory(path)
                .then(_readdirs(path)))
        .orRight(() =>
            compileModule(path)
                .then(e => e.cata(() => Promise.resolve(), _writeStart(path))))
        .takeRight();

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

execute(resolve(process.cwd(), args['<module>']))
    .catch(printError);

