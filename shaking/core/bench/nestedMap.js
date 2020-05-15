"use strict";
exports.__esModule = true;
exports.nestedMapEffect = exports.nestedMapQio = exports.nestedMapWave = void 0;
var core_1 = require("@qio/core");
var benchmark_1 = require("benchmark");
var wave = require("waveguide/lib/wave");
var T = require("../build/Effect");
var MAX = 1e3;
var inc = function (_) { return _ + BigInt(1); };
exports.nestedMapWave = function () {
    var io = wave.pure(BigInt(0));
    for (var i = 0; i < MAX; i++) {
        io = wave.map(io, inc);
    }
    return io;
};
exports.nestedMapQio = function () {
    var io = core_1.QIO.resolve(BigInt(0));
    for (var i = 0; i < MAX; i++) {
        io = core_1.QIO.map(io, inc);
    }
    return io;
};
exports.nestedMapEffect = function () {
    var io = T.pure(BigInt(0));
    for (var i = 0; i < MAX; i++) {
        io = T.effect.map(io, inc);
    }
    return io;
};
var benchmark = new benchmark_1.Suite("NestedMap " + MAX, { minTime: 10000 });
benchmark
    .add("effect", function (cb) {
    T.run(exports.nestedMapEffect(), function () {
        cb.resolve();
    });
}, { defer: true })
    .add("wave", function (cb) {
    wave.run(exports.nestedMapWave(), function () {
        cb.resolve();
    });
}, { defer: true })
    .add("qio", function (cb) {
    core_1.defaultRuntime().unsafeExecute(exports.nestedMapQio(), function () {
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
