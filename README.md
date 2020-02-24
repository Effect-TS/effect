# Introduction

[![codecov.io](http://codecov.io/github/mikearnaldi/matechs-effect/coverage.svg?branch=master)](http://codecov.io/github/mikearnaldi/matechs-effect)

Matechs Effect is a typescript library inspired by scala's ZIO and Haskell's RIO architecture.

Docs at [https://arnaldimichael.gitbook.io/matechs-effect/](https://arnaldimichael.gitbook.io/matechs-effect/)

## Note on Docs
Docs are meant to be only for introduction to the architecture but are still outdated, for proper usage refer to the test & demo packages in each package

## Details

For details about the additional types and overloads please refer to documentation in `packages/effect`

## Notes

This package is a work in progress syntax and functions might change, feedback are welcome and contributions even more!

## License
The library is released with an MIT license and the codebase is fully open-source please read: 
[LICENSE.md](https://github.com/mikearnaldi/matechs-effect/blob/master/LICENSE.md)

As with any good library there is a commercial project that support the development and maintainance, if you want to know more find us at [https://www.matechs.com/](https://www.matechs.com/) we are a digital accelerator looking for smart founders!

## Stability Grid
|      Package                  | API Stage  | Used in Prod |                            Description                            |                                 Weekly NPM                                 |
|-------------------------------|------------|--------------|-------------------------------------------------------------------|----------------------------------------------------------------------------|
| @matechs/effect               |   stable   |      yes     | Core package provides all the primitives for effect management.   |![weekly-downloads](https://badgen.net/npm/dw/@matechs/effect)              |
| @matechs/http-client          |   stable   |      yes     | Http client specification and shared utilities for http requests. |![weekly-downloads](https://badgen.net/npm/dw/@matechs/http-client)         |
| @matechs/http-client-fetch    |   stable   |      yes     | Http client implementation using a generic fetch instance.        |![weekly-downloads](https://badgen.net/npm/dw/@matechs/http-client-fetch)   |
| @matechs/http-client-libcurl  |   stable   |      yes     | Http client implementation using libcurl, supports http2 on node. |![weekly-downloads](https://badgen.net/npm/dw/@matechs/http-client-libcurl) |
| @matechs/browser              |   stable   |      yes     | Deals with reading and writing to browser local & sesstion store. |![weekly-downloads](https://badgen.net/npm/dw/@matechs/browser)             |
| @matechs/console              |   stable   |      yes     | Effectified version of node & browser console.                    |![weekly-downloads](https://badgen.net/npm/dw/@matechs/console)             |
| @matechs/rxjs                 |   stable   |      yes     | Integrates RxJS with streams, effect and rx pipe operators.       |![weekly-downloads](https://badgen.net/npm/dw/@matechs/rxjs)                |
| @matechs/epics                |   beta     |      no      | Integrate redux-observable epics in terms of effectful streams.   |![weekly-downloads](https://badgen.net/npm/dw/@matechs/epics)               |
| @matechs/rpc                  |   beta     |      yes     | Wire serializable free modules to express for remote consumption. |![weekly-downloads](https://badgen.net/npm/dw/@matechs/rpc)                 |
| @matechs/rpc-client           |   beta     |      yes     | Implement server RPC defined free modules in terms of http client.|![weekly-downloads](https://badgen.net/npm/dw/@matechs/rpc-client)          |
| @matechs/orm                  |   stable   |      yes     | Integrates with TypeORM allowing multi database manage smmothly.  |![weekly-downloads](https://badgen.net/npm/dw/@matechs/orm)                 |
| @matechs/cqrs                 |   beta     |      no      | Embeds feature complete CQRS+ES utility to ORM for PostgreSQL.    |![weekly-downloads](https://badgen.net/npm/dw/@matechs/cqrs)                |
| @matechs/express              |   beta     |      yes     | Integrates with express and provide utilities to define routes.   |![weekly-downloads](https://badgen.net/npm/dw/@matechs/express)             |
| @matechs/tracing              |   beta     |      yes     | Integrates with opentracing-js featuring auto tracing of free mod.|![weekly-downloads](https://badgen.net/npm/dw/@matechs/tracing)             |
| @matechs/graceful             |   beta     |      yes     | Utility to register callbacks to improve graceful exit scenarios. |![weekly-downloads](https://badgen.net/npm/dw/@matechs/graceful)            |
| @matechs/logger               |   stable   |      yes     | Define a generic logger interface and provide a console interpret.|![weekly-downloads](https://badgen.net/npm/dw/@matechs/logger)              |
| @matechs/logger-winston       |   stable   |      yes     | Integrates logger with a winston based interpreter.               |![weekly-downloads](https://badgen.net/npm/dw/@matechs/logger-winston)      |
| @matechs/uuid                 |   beta     |      yes     | Generates v4 uuids with different encodings, classic & short.     |![weekly-downloads](https://badgen.net/npm/dw/@matechs/uuid)                |
| @matechs/zoo                  |   beta     |      yes     | Integrates zookeeper for leader elections.                        |![weekly-downloads](https://badgen.net/npm/dw/@matechs/zoo)                 |

## Performance
Currently we run only minor benchmarks in ci where we test against `@qio` and `waveguide` as they represent a similar feature-set, the benchmarks may be affected by environmental conditions and they are not necessarily a representation of the production performance where we can expect all those libraries to perform similarly.

Running on a dedicated box with no load:
```
Fibonacci:
effect x 28,317 ops/sec ±0.79% (84 runs sampled)
effect-fluent x 29,032 ops/sec ±0.70% (86 runs sampled)
qio x 27,998 ops/sec ±0.96% (87 runs sampled)
wave x 20,731 ops/sec ±0.64% (85 runs sampled)
promise x 7,599 ops/sec ±0.35% (86 runs sampled)
native x 39,571 ops/sec ±0.22% (90 runs sampled)
Fastest is native

Nested Map 100
effect x 13,207 ops/sec ±0.37% (86 runs sampled)
effect-fluent x 13,408 ops/sec ±0.35% (89 runs sampled)
wave x 5,352 ops/sec ±0.45% (88 runs sampled)
qio x 11,607 ops/sec ±0.85% (86 runs sampled)
Fastest is effect-fluent

Nested Chain 1000
effect x 1,099 ops/sec ±0.51% (87 runs sampled)
effect-fluent x 1,118 ops/sec ±0.25% (90 runs sampled)
wave x 628 ops/sec ±0.44% (89 runs sampled)
qio x 984 ops/sec ±0.45% (89 runs sampled)
Fastest is effect-fluent
```

## Thanks

This library would have not been feasibly possible without the strong foundations of [fp-ts](https://github.com/gcanti/fp-ts) and [Waveguide](https://github.com/rzeigler/waveguide) from which we have forked the base bifunctor and execution runtime, huge thanks to the Authors.

This library was initially based on Fluture, huge thanks to the Authors.

Another huge thanks goes to both the scala community (ZIO in specific) and the haskell community (RIO & Polysemy) from which inspiration is taken.

All of the above projects are advised!

## Get in touch
The best place to reach out would be either in https://fpchat-invite.herokuapp.com (FP Chat, @Michael Arnaldi) or for italians https://italiajs.herokuapp.com/ (Italia JS, @Michael Arnaldi or channel #fp)
