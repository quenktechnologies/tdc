import { EOL } from 'os';

import { Path } from '@quenk/noni/lib/io/file';
import { uncapitalize, camelCase } from '@quenk/noni/lib/data/string';
import { reduce } from '@quenk/noni/lib/data/record';
import { Code } from './output';

/**
 * Name of variable.
 */
export type Name = string;

/**
 * Imports is a map of module ids to there paths.
 *
 * For both jcon and rcl, we convert module pointer syntax to qualified
 * imports, therefore the keys here are the variables introduced to the
 * final script's scope.
 */
export interface Imports {

    [key: string]: Path

}

/**
 * normalize converts a string (usually a path to an appropriate syntax for use
 * as a variable name.
 */
export const normalize = (name: Name): Name =>
    uncapitalize(camelCase(
      name.replace(/[.]/g, 'dot').replace(/[^\w]/g, '_'))
    );

/**
 * toCode converts an Imports object into a TypeScript string.
 */
export const toCode = (imps: Imports, eol = EOL): Code =>
    reduce(imps, [], (p, c, k) =>
        [...p, `import * as ${k} from '${c}'; `]).join(eol);
