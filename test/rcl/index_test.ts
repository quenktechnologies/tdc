import * as fs from 'fs';
import { must } from '@quenk/must';
import { pure } from '@quenk/noni/lib/control/monad/future';
import { compile, newContext } from '../../src/rcl';

const EXPECTATIONS = `${__dirname}/expectations`;

const includes = {

    a: `GET / "index"`,

    b: `
     %include "c"
POST / check create`,

    c: `PUT /:id check update`

}

const loader = (path: string) =>
    pure(includes[path]);

const compare = (tree: any, that: any) =>
    must(tree).equate(that);

const makeTest = (test, index) => {

    var file = index.replace(/\s/g, '-');

    if (process.env.GENERATE) {

        return compile(test, newContext(loader))
            .fork(e => { throw e; },
                txt =>
                    fs.writeFileSync(`${EXPECTATIONS}/${file}.typescript`, txt));

    }

    if (!test.skip) {

        compile(test, newContext(loader))
            .fork(e => { throw e; },
                txt => compare(txt,
                    fs.readFileSync(`${EXPECTATIONS}/${file}.json`, {
                        encoding: 'utf8'
                    })));

    }

}

const tests = {

    'should work': `
  %include "a"
  %include "b"
  %import check,create,update,delete from "somewhere"

  -- This should work.
  DELETE /:id check delete
    `
};

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

