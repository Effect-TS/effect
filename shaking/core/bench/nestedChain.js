"use strict";
exports.__esModule = true;
exports.nestedChainEffect = exports.nestedChainWave = exports.nestedChainQio = void 0;
var core_1 = require("@qio/core");
var benchmark_1 = require("benchmark");
var wave = require("waveguide/lib/wave");
var T = require("../build/Effect");
var MAX = 1e4;
var waveMapper = function (_) { return wave.pure(_ + BigInt(1)); };
var effectMapper = function (_) { return T.pure(_ + BigInt(1)); };
var qioMapper = function (_) { return core_1.QIO.resolve(_ + BigInt(1)); };
exports.nestedChainQio = function () {
    var io = core_1.QIO.resolve(BigInt(0));
    for (var i = 0; i < MAX; i++) {
        io = core_1.QIO.chain(io, qioMapper);
    }
    return io;
};
exports.nestedChainWave = function () {
    var io = wave.pure(BigInt(0));
    for (var i = 0; i < MAX; i++) {
        io = wave.chain(io, waveMapper);
    }
    return io;
};
exports.nestedChainEffect = function () {
    var io = T.pure(BigInt(0));
    for (var i = 0; i < MAX; i++) {
        io = T.effect.chain(io, effectMapper);
    }
    return io;
};
var benchmark = new benchmark_1.Suite("NestedChain " + MAX, { minTime: 10000 });
benchmark
    .add("effect", function (cb) {
    T.run(exports.nestedChainEffect(), function () {
        cb.resolve();
    });
}, { defer: true })
    .add("wave", function (cb) {
    wave.run(exports.nestedChainWave(), function () {
        cb.resolve();
    });
}, { defer: true })
    .add("qio", function (cb) {
    core_1.defaultRuntime().unsafeExecute(exports.nestedChainQio(), function () {
        cb.resolve();
    });
}, { defer: true })
    .on("cycle", function (event) {
    console.log(String(event.target));
})
    .on("complete", function () {
    console.log("Fastest is " + this.filter("fastest").map("name"));
})
    .run({ async: true });
