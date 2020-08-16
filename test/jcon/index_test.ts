import * as fs from 'fs';

import { assert } from '@quenk/test/lib/assert';
import { pure } from '@quenk/noni/lib/control/monad/future';
import { tests } from '@quenk/jcon/lib/test';

import { parse, compile, newContext } from '../../src/jcon';

const EXPECTATIONS = `${__dirname}/expectations`;

const includes = {

    'some path': `include "otherpath" name.title = "Mr."`,

    'otherpath': `include "lastpath" name.middle = "K" trapN = some-module#trap`,

    'lastpath': `modules = [] submodules = []`

}

const loader = (path: string) =>
    pure(includes[path]);

const compare = (tree: any, that: any) =>
    assert(tree).equate(that);

const makeTest = (test, index) => {

    var file = index.replace(/\s/g, '-');

    if (process.env.GENERATE) {

        return parse(test)
            .chain(f => compile(newContext(__dirname, loader), f))
            .fork(e => { throw e; },
                txt =>
                    fs.writeFileSync(`${EXPECTATIONS}/${file}.typescript`, txt));

    }

    if (!test.skip) {

        return parse(test)
            .chain(f => compile(newContext(__dirname, loader), f))
            .fork(e => { throw e; },
                txt => compare(txt,
                    fs.readFileSync(`${EXPECTATIONS}/${file}.typescript`, {
                        encoding: 'utf8'
                    })));

    }

}

describe('jcon', () => {

    describe('compile', () => {

        Object.keys(tests).forEach(k => {

            it(k, () => {

                if (Array.isArray(tests[k])) {

                    tests[k].forEach(makeTest);

                } else {

                    makeTest(tests[k], k);

                }

            });
        });

    });

});
