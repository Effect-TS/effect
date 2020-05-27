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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.offsetStore = exports.readEvents = exports.esMetaURI = void 0;
var long_1 = __importDefault(require("long"));
var client_1 = require("./client");
var T = __importStar(require("@matechs/core/Effect"));
var E = __importStar(require("@matechs/core/Either"));
var M = __importStar(require("@matechs/core/Managed"));
var Pipe_1 = require("@matechs/core/Pipe");
exports.esMetaURI = "@matechs/cqrs-es/esMetaURI";
exports.readEvents = function (readId) { return function (streamId) { return function (decode) { return function (process) { return function (store) { return function (provider) {
    return M.use(client_1.eventStoreTcpConnection, function (connection) {
        return Pipe_1.pipe(T.sequenceT(client_1.accessConfig, store.get(readId, streamId), T.accessEnvironment()), T.chain(function (_a) {
            var config = _a[0], from = _a[1], r = _a[2];
            return T.async(function (done) {
                var subscription = connection.subscribeToStreamFrom(streamId, long_1.default.fromString(BigInt(from).toString(10), false, 10), true, function (_, event) {
                    if (event.event && event.event.data) {
                        return T.runToPromise(Pipe_1.pipe(decode(JSON.parse(event.event.data.toString("utf-8"))), T.mapError(function (e) { return ({
                            type: "decode",
                            error: e
                        }); }), T.chain(function (x) {
                            var _a;
                            return Pipe_1.pipe(__assign(__assign({}, x), (_a = {}, _a[exports.esMetaURI] = { raw: event }, _a)), process, T.mapError(function (e) { return ({
                                type: "process",
                                error: e
                            }); }));
                        }), T.chainTap(function (_) {
                            return Pipe_1.pipe(store.set(readId, event.originalStreamId, BigInt(event.originalEventNumber.toString(10))), T.mapError(function (e) { return ({
                                type: "offset",
                                error: e
                            }); }));
                        }), provider, T.mapError(function (x) {
                            return "type" in x ? x : { type: "provider", error: x };
                        }), T.provide(r)));
                    }
                    else {
                        return Promise.resolve();
                    }
                }, function () {
                    // live
                }, function (_, _reason, error) {
                    if (error) {
                        done("type" in error
                            ? E.left(error)
                            : E.left({
                                type: "EventStoreError",
                                message: error["message"]
                            }));
                    }
                    else {
                        done(E.left({
                            type: "EventStoreError",
                            message: _reason
                        }));
                    }
                }, config.settings.defaultUserCredentials);
                return function () {
                    subscription.stop();
                };
            });
        }));
    });
}; }; }; }; }; };
exports.offsetStore = function (_) { return _; };
