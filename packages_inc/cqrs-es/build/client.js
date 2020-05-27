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
exports.sendEvent = exports.adaptEvent = exports.sendEventToEventStore = exports.eventStoreTcpConnection = exports.accessConfig = exports.eventStoreURI = void 0;
var long_1 = __importDefault(require("long"));
var node_eventstore_client_1 = __importDefault(require("node-eventstore-client"));
var T = __importStar(require("@matechs/core/Effect"));
var E = __importStar(require("@matechs/core/Either"));
var M = __importStar(require("@matechs/core/Managed"));
var Pipe_1 = require("@matechs/core/Pipe");
var cqrs_1 = require("@matechs/cqrs");
exports.eventStoreURI = "@matechs/cqrs-es/eventStoreURI";
exports.accessConfig = T.access(function (r) { return r[exports.eventStoreURI]; });
exports.eventStoreTcpConnection = M.bracket(Pipe_1.pipe(exports.accessConfig, T.chain(function (_a) {
    var connectionName = _a.connectionName, endPointOrGossipSeed = _a.endPointOrGossipSeed, settings = _a.settings;
    return T.async(function (r) {
        var conn = node_eventstore_client_1.default.createConnection(settings, endPointOrGossipSeed, connectionName);
        conn
            .connect()
            .then(function () {
            r(E.right(conn));
        })
            .catch(function (e) {
            r(E.left({ type: "EventStoreError", message: e.message }));
        });
        return function () {
            conn.close();
        };
    });
})), function (c) {
    return T.sync(function () {
        c.close();
    });
});
exports.sendEventToEventStore = function (event) { return function (connection) {
    return T.fromPromiseMap(function (e) { return ({
        type: "EventStoreError",
        message: e.message
    }); })(function () {
        return connection.appendToStream(event.streamId, long_1.default.fromString(event.expectedStreamVersion.toString(10), false, 10), node_eventstore_client_1.default.createJsonEventData(event.eventId, event.data, event.eventMetadata, event.eventType));
    });
}; };
exports.adaptEvent = function (event) {
    var esE = {};
    esE.data = __assign({}, event);
    delete esE.data[cqrs_1.metaURI];
    esE.eventId = event[cqrs_1.metaURI].id;
    esE.eventType = event[cqrs_1.metaURI].kind;
    esE.streamId = event[cqrs_1.metaURI].aggregate + "-" + event[cqrs_1.metaURI].root;
    esE.expectedStreamVersion = BigInt(event[cqrs_1.metaURI].sequence) - BigInt(1);
    esE.eventMetadata = {
        createdAt: event[cqrs_1.metaURI].createdAt,
        aggregate: event[cqrs_1.metaURI].aggregate,
        root: event[cqrs_1.metaURI].root,
        sequence: BigInt(event[cqrs_1.metaURI].sequence).toString(10)
    };
    return esE;
};
exports.sendEvent = function (connection) { return function (event) { return T.asUnit(exports.sendEventToEventStore(exports.adaptEvent(event))(connection)); }; };
