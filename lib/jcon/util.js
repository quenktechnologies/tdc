"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDirectives = void 0;
const future_1 = require("@quenk/noni/lib/control/monad/future");
const _1 = require(".");
/**
 * getAllDirectives provides the directives of a File (and all included files).
 */
const getAllDirectives = (ctx, f) => (0, future_1.doFuture)(function* () {
    let work = f.includes.map(i => (0, future_1.doFuture)(function* () {
        let { path } = i;
        let file = yield (0, _1.parseJCONFile)(ctx, path.value);
        let childDirectives = yield (0, exports.getAllDirectives)(ctx, file);
        return (0, future_1.pure)([...childDirectives, ...file.directives]);
    }));
    let results = yield (0, future_1.sequential)(work);
    let flatResults = results.reduce((p, c) => p.concat(c), []);
    return (0, future_1.pure)([...flatResults, ...f.directives]);
});
exports.getAllDirectives = getAllDirectives;
//# sourceMappingURL=util.js.map