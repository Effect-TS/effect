"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregate = void 0;
var client_1 = require("./client");
var meta_1 = require("./meta");
var offset_1 = require("./offset");
var read_1 = require("./read");
var T = __importStar(require("@matechs/core/Effect"));
var M = __importStar(require("@matechs/core/Managed"));
var O = __importStar(require("@matechs/core/Option"));
var Pipe_1 = require("@matechs/core/Pipe");
var aggregateRead = function (agg) { return function (config) {
    return M.use(client_1.eventStoreTcpConnection, function (connection) {
        return agg.readAll(config)(function (_) { return T.traverseArray(client_1.sendEvent(connection)); });
    });
}; };
exports.aggregate = function (agg) { return ({
    dispatcher: aggregateRead(agg),
    read: function (readId) { return function (process) {
        return read_1.readEvents(readId)("$ce-" + agg.aggregate)(T.liftEither(function (x) { return agg.adt.type.decode(x); }))(function (a) {
            return Pipe_1.pipe(meta_1.adaptMeta(a), function (meta) {
                return O.isSome(meta)
                    ? process(__assign(__assign({}, a), meta.value))
                    : T.raiseAbort(new Error("cannot decode metadata"));
            });
        })(offset_1.ormOffsetStore(agg.db))(function (x) { return agg.db.withORMTransaction(x); });
    }; }
}); };
var client_2 = require("./client");
Object.defineProperty(exports, "eventStoreURI", { enumerable: true, get: function () { return client_2.eventStoreURI; } });
var read_2 = require("./read");
Object.defineProperty(exports, "offsetStore", { enumerable: true, get: function () { return read_2.offsetStore; } });
Object.defineProperty(exports, "readEvents", { enumerable: true, get: function () { return read_2.readEvents; } });
var offset_2 = require("./offset");
Object.defineProperty(exports, "TableOffset", { enumerable: true, get: function () { return offset_2.TableOffset; } });
Object.defineProperty(exports, "ormOffsetStore", { enumerable: true, get: function () { return offset_2.ormOffsetStore; } });
