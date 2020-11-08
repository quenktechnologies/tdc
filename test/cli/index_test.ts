import * as fs from 'fs';

import { merge } from '@quenk/noni/lib/data/record';
import { doFuture, toPromise, pure } from '@quenk/noni/lib/control/monad/future';
import { assert } from '@quenk/test/lib/assert';

import { Options, compile, getTDCFiles } from '../../src/cli';

interface Test {

    name: string,

    options?: Partial<Options>,

    skip?: boolean

}

const options = {

    module: '',

    noRecurse: false,

    noStart: true,

    ignore: [],

    main: '@quenk/tendril/lib/app#App',

    rootDir: process.cwd()

}

const makeTest = (test: string | Test) => doFuture(function*() {

    let isString = typeof (test) === 'string';

    let name = isString ? <string>test : (<Test>test).name;

    let filename = name.split(' ').join('-');

    let path = `${__dirname}/tests/${filename}`;

    let files = yield getTDCFiles(path);

    let opts = isString ? options : merge(options, (<Test>test).options || {});

    let code = yield compile(files, opts, path);

    if (process.env.GENERATE) {

        fs.writeFileSync(`${__dirname}/expectations/${filename}.ts`, code);

    } else if (!isString && !((<Test>test).skip)) {

        let expectedTxt = fs.readFileSync(
            `${__dirname}/expectations/${filename}.ts`,
            { encoding: 'utf8' }
        );

        assert(expectedTxt).equal(code);

    }

    return pure(undefined);

});

const tests: (string | Test)[] = [

    'should work with includes'
];

describe('cli', () => {

    describe('compile', () => {

        tests.forEach((test) =>
            it((typeof test === 'string') ? test : test.name, () =>
                toPromise(makeTest(test))));

    });

});
