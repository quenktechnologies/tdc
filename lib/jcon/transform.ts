import * as ast from '@quenk/jcon/lib/ast';

/**
 * ensureID ensures a parsed conf file has an id.
 *
 * If there is no id property at the root level then the passed defaultID
 * will be used.
 */
export const ensureID = (f: ast.File, id: string): ast.File => {

    let hasId = f.directives.some(p => (p instanceof ast.Property) &&
        (p.path[0].value === 'id'));

    return hasId ? f : new ast.File(
        f.includes,
        [
            new ast.Property(
                [new ast.Identifier('id', {})],
                new ast.StringLiteral(id, {}),
                {}),
            ...f.directives,
        ],
        {});

}
