"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformTree = exports.flattenDirectives = exports.addProperties = void 0;
const ast = require("@quenk/jcon/lib/ast");
const path_1 = require("path");
const future_1 = require("@quenk/noni/lib/control/monad/future");
const util_1 = require("./util");
/**
 * addProperties adds special properties useful for module configuration.
 *
 * Currently these are:
 *
 * 1. id (uses the module basename if not provided)
 * 2. app.dirs.self
 */
exports.addProperties = (ctx, f) => {
    let id = f.directives.reduce((prev, prop) => ((prop instanceof ast.Property) && (prop.path[0].value === 'id')) ?
        prop.value.value : prev, path_1.basename(ctx.path));
    let idProp = new ast.Property([new ast.Identifier('id', {})], new ast.StringLiteral(id, {}), {});
    let selfProp = new ast.Property([
        new ast.Identifier('app', {}),
        new ast.Identifier('dirs', {}),
        new ast.Identifier('self', {}),
    ], new ast.StringLiteral(getRelPath(ctx.root, ctx.path), {}), {});
    return new ast.File(f.includes, [idProp, selfProp, ...f.directives], {});
};
const getRelPath = (root, dir) => {
    let path = path_1.normalize(dir.split(root).join(''));
    return (path === '') ? '/' : path;
};
/**
 * flattenDirectives loads the directives of all the includes and makes them
 * available to the root File.
 */
exports.flattenDirectives = (ctx, f) => future_1.doFuture(function* () {
    let dirs = yield util_1.getAllDirectives(ctx, f);
    return future_1.pure(new ast.File(f.includes, dirs, f.location));
});
/**
 * transformTree applies all the transforms to the AST in one go.
 */
exports.transformTree = (ctx, f) => future_1.doFuture(function* () {
    let file = yield exports.flattenDirectives(ctx, f);
    return future_1.pure(exports.addProperties(ctx, file));
});
//# sourceMappingURL=transform.js.map