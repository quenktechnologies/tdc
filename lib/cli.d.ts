/// <reference path="../src/Error.d.ts" />
/// <reference path="../src/docopt.d.ts" />
export interface Arguments {
    '--modules': boolean;
    '<module>': string;
}
export interface Compiler {
    (s: string): string;
}
/**
 * CompileError
 */
export declare class CompileError extends Error {
    path: string;
    error: string;
    constructor(path: string, error: string);
}
