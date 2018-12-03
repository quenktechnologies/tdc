import * as fs from 'fs';
import { must } from '@quenk/must';
import { pure } from '@quenk/noni/lib/control/monad/future';
import { compile, newContext } from '../../src/jcon';

const EXPECTATIONS = `${__dirname}/expectations`;

const includes = {

    a: `name.middle = "K" 
     trapN = some-module#trap`,

    b: `
     include "c"
     name.title = "Mr."`,

    c: `modules = [] submodules = []`

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
  include "a"
  include "b"

  -- Opening comment.
  -- Following comment.
   id = \${ID}
   name.first = "F"
   name.last = "L"

   -- Nothing on this line should be parsed. [1,2,3]
   -- For real
   app.connections.config = {

       main = {

        connector = path/to/connector#connect

       }

       backup = {

        connector = path/to/connector#backup(1, 2, 3)

       }

   }
  modules = [path#default, os#default, http#default ]
  trap = trap#default()
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

