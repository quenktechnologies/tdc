import { Path } from '@quenk/noni/lib/io/file';
import { Code } from './output';
/**
 * Name of variable.
 */
export declare type Name = string;
/**
 * Imports is a map of module ids to there paths.
 *
 * For both jcon and rcl, we convert module pointer syntax to qualified
 * imports, therefore the keys here are the variables introduced to the
 * final script's scope.
 */
export interface Imports {
    [key: string]: Path;
}
/**
 * normalize converts a string (usually a path to an appropriate syntax for use
 * as a variable name.
 */
export declare const normalize: (name: Name) => Name;
/**
 * toCode converts an Imports object into a TypeScript string.
 */
export declare const toCode: (imps: Imports, eol?: string) => Code;
