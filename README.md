# Introduction

[![codecov.io](http://codecov.io/github/mikearnaldi/matechs-effect/coverage.svg?branch=master)](http://codecov.io/github/mikearnaldi/matechs-effect) [![Known Vulnerabilities](https://snyk.io/test/github/Matechs-Garage/matechs-effect/badge.svg)](https://snyk.io/test/github/Matechs-Garage/{matechs-effect})

Matechs Effect is a Fully-fledged functional effect system for typescript with a rich standard library including modules for http server & client, logger, orm, cqrs+es, zookeeper leader election, next.js, apollo, rxjs, redux-observables and more.

Docs at [https://arnaldimichael.gitbook.io/matechs-effect/](https://arnaldimichael.gitbook.io/matechs-effect/)

## Folders
* packages : core packages
* packages_inc : projects in incubation stage
* packages_sys : system level utilities
* packages_http : http related utilities (client/server)
* packages_fe : frontend related utilities (pure client)
* packages_be : backend related utilities (pure server)

## Note on Docs
Docs are meant to be only for introduction to the architecture but are still outdated, for proper usage refer to the test & demo packages in each package

## Notes

This package is a work in progress syntax and functions might change, feedback are welcome and contributions even more!

## Videos
26-03-2020 Introduction call, basic explaination of the effect library and showcase of examples:
[https://vimeo.com/401143293](https://vimeo.com/401143293)

## License
The library is released with an MIT license and the codebase is fully open-source please read: 
[LICENSE.md](https://github.com/mikearnaldi/matechs-effect/blob/master/LICENSE.md)

As with any good library there is a commercial project that support the development and maintainance, if you want to know more find us at [https://www.matechs.com/](https://www.matechs.com/) we are a digital accelerator looking for smart founders!

## Performance
Currently we run only minor benchmarks in ci where we test against `@qio` and `waveguide` as they represent a similar feature-set, the benchmarks may be affected by environmental conditions and they are not necessarily a representation of the production performance where we can expect all those libraries to perform similarly. Additionally there is a radical difference on how we manage interruptability & resource safety, in `effect` we will always prefer safety over performance for this reason we support async interruption with error tracking and full bracketing semantics

Running on cpu i9 @ 4ghz free of load:
```
ma@DESKTOP-EO3P07N:~/os/matechs-effect/packages/core$ node bench/index.js 
qio x 36,729 ops/sec ±3.27% (71 runs sampled)
wave x 21,732 ops/sec ±1.80% (75 runs sampled)
promise x 8,890 ops/sec ±1.49% (74 runs sampled)
native x 40,658 ops/sec ±1.52% (73 runs sampled)
effect x 39,765 ops/sec ±1.84% (76 runs sampled)
effectPipe x 40,289 ops/sec ±1.62% (76 runs sampled)
Fastest is native

ma@DESKTOP-EO3P07N:~/os/matechs-effect/packages/core$ node bench/nestedMap.js 
wave x 5,618 ops/sec ±1.75% (73 runs sampled)
qio x 20,387 ops/sec ±1.58% (76 runs sampled)
effect x 21,385 ops/sec ±1.50% (75 runs sampled)
Fastest is effect

ma@DESKTOP-EO3P07N:~/os/matechs-effect/packages/core$ node bench/nestedChain.js 
wave x 699 ops/sec ±1.38% (76 runs sampled)
qio x 2,061 ops/sec ±2.08% (73 runs sampled)
effect x 2,116 ops/sec ±1.87% (76 runs sampled)
Fastest is effect
```

## Thanks

This library would have not been feasibly possible without the strong foundations of [fp-ts](https://github.com/gcanti/fp-ts) and [Waveguide](https://github.com/rzeigler/waveguide) from which we have forked the base bifunctor and execution runtime, huge thanks to the Authors.

This library was initially based on Fluture, huge thanks to the Authors.

Another huge thanks goes to both the scala community (ZIO in specific) and the haskell community (RIO & Polysemy) from which inspiration is taken.

All of the above projects are advised!

## Get in touch
The best place to reach out would be either in https://fpchat-invite.herokuapp.com (FP Chat, channel #matechs) or for italians https://italiajs.herokuapp.com/ (Italia JS, @Michael Arnaldi or channel #fp)
