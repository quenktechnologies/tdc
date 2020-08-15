import * as ast from '@quenk/jcon/lib/ast';
/**
 * ensureID ensures a parsed conf file has an id.
 *
 * If there is no id property at the root level then the passed defaultID
 * will be used.
 */
export declare const ensureID: (f: ast.File, id: string) => ast.File;
