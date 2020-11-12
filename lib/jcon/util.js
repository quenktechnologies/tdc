"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDirectives = void 0;
const future_1 = require("@quenk/noni/lib/control/monad/future");
const _1 = require(".");
/**
 * getAllDirectives provides the directives of a File (and all included files).
 */
exports.getAllDirectives = (ctx, f) => future_1.doFuture(function* () {
    let work = f.includes.map(i => future_1.doFuture(function* () {
        let { path } = i;
        let file = yield _1.parseJCONFile(ctx, path.value);
        let childDirectives = yield exports.getAllDirectives(ctx, file);
        return future_1.pure([...childDirectives, ...file.directives]);
    }));
    let results = yield future_1.sequential(work);
    let flatResults = results.reduce((p, c) => p.concat(c), []);
    return future_1.pure([...flatResults, ...f.directives]);
});
//# sourceMappingURL=util.js.map