"use strict";
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
exports.adaptMeta = void 0;
var read_1 = require("./read");
var O = __importStar(require("@matechs/core/Option"));
var cqrs_1 = require("@matechs/cqrs");
function adaptMeta(meta) {
    var _a;
    var _b;
    var event = O.fromNullable(meta[read_1.esMetaURI].raw.event);
    if (O.isNone(event)) {
        return O.none;
    }
    var metaS = O.fromNullable((_b = event.value.metadata) === null || _b === void 0 ? void 0 : _b.toString("utf-8"));
    if (O.isNone(metaS)) {
        return O.none;
    }
    try {
        var metaE = JSON.parse(metaS.value);
        return O.some((_a = {},
            _a[cqrs_1.metaURI] = {
                kind: event.value.eventType,
                id: event.value.eventId,
                createdAt: metaE.createdAt,
                aggregate: metaE.aggregate,
                root: metaE.root,
                sequence: BigInt(metaE.sequence)
            },
            _a));
    }
    catch (_c) {
        return O.none;
    }
}
exports.adaptMeta = adaptMeta;
