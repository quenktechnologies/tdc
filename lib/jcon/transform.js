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
const addProperties = (ctx, f) => {
    let id = f.directives.reduce((prev, prop) => ((prop instanceof ast.Property) && (prop.path[0].value === 'id')) ?
        prop.value.value : prev, (0, path_1.basename)(ctx.path));
    let idProp = new ast.Property([new ast.Identifier('id', {})], new ast.StringLiteral(id, {}), {});
    let selfProp = new ast.Property([
        new ast.Identifier('app', {}),
        new ast.Identifier('dirs', {}),
        new ast.Identifier('self', {}),
    ], new ast.StringLiteral(getRelPath(ctx.root, ctx.path), {}), {});
    return new ast.File(f.includes, [idProp, selfProp, ...f.directives], {});
};
exports.addProperties = addProperties;
const getRelPath = (root, dir) => {
    let path = (0, path_1.normalize)(dir.split(root).join(''));
    return (path === '') ? '/' : path;
};
/**
 * flattenDirectives loads the directives of all the includes and makes them
 * available to the root File.
 */
const flattenDirectives = (ctx, f) => (0, future_1.doFuture)(function* () {
    let dirs = yield (0, util_1.getAllDirectives)(ctx, f);
    return (0, future_1.pure)(new ast.File(f.includes, dirs, f.location));
});
exports.flattenDirectives = flattenDirectives;
/**
 * transformTree applies all the transforms to the AST in one go.
 */
const transformTree = (ctx, f) => (0, future_1.doFuture)(function* () {
    let file = yield (0, exports.flattenDirectives)(ctx, f);
    return (0, future_1.pure)((0, exports.addProperties)(ctx, file));
});
exports.transformTree = transformTree;
//# sourceMappingURL=transform.js.map