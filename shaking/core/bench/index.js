"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.fibEffect = exports.fibQio = exports.fibWave = exports.fib = exports.fibPromise = void 0;
var core_1 = require("@qio/core");
var benchmark_1 = require("benchmark");
var wave = require("waveguide/lib/wave");
var T = require("../build/Effect");
exports.fibPromise = function (n) { return __awaiter(void 0, void 0, void 0, function () {
    var a, b;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(n < BigInt(2))) return [3 /*break*/, 2];
                return [4 /*yield*/, Promise.resolve(BigInt(1))];
            case 1: return [2 /*return*/, _a.sent()];
            case 2: return [4 /*yield*/, exports.fibPromise(n - BigInt(1))];
            case 3:
                a = _a.sent();
                return [4 /*yield*/, exports.fibPromise(n - BigInt(2))];
            case 4:
                b = _a.sent();
                return [2 /*return*/, a + b];
        }
    });
}); };
exports.fib = function (n) {
    if (n < BigInt(2)) {
        return BigInt(1);
    }
    return exports.fib(n - BigInt(1)) + exports.fib(n - BigInt(2));
};
exports.fibWave = function (n) {
    if (n < BigInt(2)) {
        return wave.pure(BigInt(1));
    }
    return wave.chain(exports.fibWave(n - BigInt(1)), function (a) {
        return wave.map(exports.fibWave(n - BigInt(2)), function (b) { return a + b; });
    });
};
exports.fibQio = function (n) {
    if (n < BigInt(2)) {
        return core_1.QIO.resolve(BigInt(1));
    }
    return core_1.QIO.chain(exports.fibQio(n - BigInt(1)), function (a) {
        return core_1.QIO.map(exports.fibQio(n - BigInt(2)), function (b) { return a + b; });
    });
};
exports.fibEffect = function (n) {
    if (n < BigInt(2)) {
        return T.pure(BigInt(1));
    }
    return T.effect.chain(exports.fibEffect(n - BigInt(1)), function (a) {
        return T.effect.map(exports.fibEffect(n - BigInt(2)), function (b) { return a + b; });
    });
};
var n = BigInt(10);
var benchmark = new benchmark_1.Suite("Fibonacci", { minTime: 10000 });
benchmark
    .add("effect", function (cb) {
    T.run(exports.fibEffect(n), function () {
        cb.resolve();
    });
}, { defer: true })
    .add("qio", function (cb) {
    core_1.defaultRuntime().unsafeExecute(exports.fibQio(n), function () {
        cb.resolve();
    });
}, { defer: true })
    .add("wave", function (cb) {
    wave.run(exports.fibWave(n), function () {
        cb.resolve();
    });
}, { defer: true })
    .add("promise", function (cb) {
    exports.fibPromise(n).then(function () {
        cb.resolve();
    });
}, { defer: true })
    .add("native", function (cb) {
    exports.fib(n);
    cb.resolve();
}, { defer: true })
    .on("cycle", function (event) {
    console.log(String(event.target));
})
    .on("complete", function () {
    console.log("Fastest is " + this.filter("fastest").map("name"));
})
    .run({ async: true });
