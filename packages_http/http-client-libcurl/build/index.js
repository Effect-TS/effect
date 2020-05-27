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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.libcurl = void 0;
var path_1 = __importDefault(require("path"));
var C = __importStar(require("node-libcurl"));
var query_string_1 = __importDefault(require("query-string"));
var T = __importStar(require("@matechs/core/Effect"));
var E = __importStar(require("@matechs/core/Either"));
var F = __importStar(require("@matechs/core/Function"));
var O = __importStar(require("@matechs/core/Option"));
var Pipe_1 = require("@matechs/core/Pipe");
var R = __importStar(require("@matechs/core/Record"));
var H = __importStar(require("@matechs/http-client"));
exports.libcurl = function (_) {
    var _a;
    if (_ === void 0) { _ = {}; }
    return (_a = {},
        _a[H.httpEnv] = {
            request: function (method, url, requestType, responseType, headers, body) {
                return requestType === "FORM" || requestType === "BINARY"
                    ? /* istanbul ignore next */ requestType === "FORM"
                        ? T.raiseError({
                            // cannot be triggered from exposed functions
                            _tag: H.HttpErrorReason.Request,
                            error: new Error("multipart form not supported")
                        })
                        : T.raiseError({
                            // cannot be triggered from exposed functions
                            _tag: H.HttpErrorReason.Request,
                            error: new Error("binary not supported")
                        })
                    : T.async(function (done) {
                        var _a = _.caPath, caPath = _a === void 0 ? path_1.default.join(require.resolve("@matechs/http-client-libcurl").replace("index.js", ""), "../cacert-2019-11-27.pem") : _a, _b = _.requestTransformer, requestTransformer = _b === void 0 ? F.identity : _b;
                        var req = new C.Curl();
                        var reqHead = __spreadArrays(H.foldRequestType(requestType, function () { return ["Content-Type: application/json"]; }, function () { return ["Content-Type: application/x-www-form-urlencoded"]; }, function () { return ["Content-Type: multipart/form-data"]; }, function () { return ["Content-Type: application/octet-stream"]; }), Pipe_1.pipe(headers, R.collect(function (k, v) { return k + ": " + v; })));
                        requestTransformer(req);
                        req.setOpt("URL", url);
                        req.setOpt("CAINFO", caPath);
                        req.setOpt("FOLLOWLOCATION", 1);
                        req.setOpt("VERBOSE", 0);
                        req.setOpt("SSL_VERIFYHOST", 2);
                        req.setOpt("SSL_VERIFYPEER", 1);
                        req.setOpt(C.Curl.option.HTTPHEADER, reqHead);
                        customReq(H.getMethodAsString(method), req, requestType, body);
                        req
                            .on("error", function (error) {
                            done(E.left({
                                _tag: H.HttpErrorReason.Request,
                                error: error
                            }));
                        })
                            .on("end", function (statusCode, body, headers) {
                            if (statusCode >= 200 && statusCode < 300) {
                                H.foldResponseType(responseType, function () {
                                    // JSON
                                    return done(E.map_(E.tryCatch_(function () { return JSON.parse(body.toString()); }, function () { return ({
                                        // TODO: verify what to do exactly, this is not an error from the API => we should enlarge our error type
                                        _tag: H.HttpErrorReason.Response,
                                        response: getResponse(statusCode, "not a Json", headers)
                                    }); }), function (json) { return getResponse(statusCode, json, headers); }));
                                }, function () {
                                    // TEXT
                                    return done(E.right(getResponse(statusCode, body.toString(), headers)));
                                }, function () {
                                    return Buffer.isBuffer(body)
                                        ? done(E.right(getResponse(statusCode, body, headers)))
                                        : // BINARY
                                            done(E.left({
                                                _tag: H.HttpErrorReason.Response,
                                                response: getResponse(statusCode, "not a buffer", headers)
                                            }));
                                });
                            }
                            else {
                                done(E.left({
                                    _tag: H.HttpErrorReason.Response,
                                    response: getResponse(statusCode, body.toString(), headers)
                                }));
                            }
                        });
                        req.perform();
                        return function (cb) {
                            req.close();
                            cb();
                        };
                    });
            }
        },
        _a);
};
function customReq(method, req, requestType, body) {
    if (body) {
        req.setOpt(C.Curl.option.POSTFIELDS, H.foldRequestType(requestType, function () { return JSON.stringify(body); }, function () { return query_string_1.default.stringify(body); }, function () { return query_string_1.default.stringify(body); }, function () { return body.toString("utf-8"); }));
    }
    req.setOpt(C.Curl.option.CUSTOMREQUEST, method);
}
function getResponse(statusCode, body, headers) {
    return {
        status: statusCode,
        body: O.fromNullable(body),
        headers: getHeaders(headers)
    };
}
function getHeaders(headers) {
    /* istanbul ignore next */
    return headers.length > 0 ? (typeof headers[0] !== "number" ? headers[0] : {}) : {};
}
