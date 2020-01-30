# Introduction

[![codecov.io](http://codecov.io/github/mikearnaldi/matechs-effect/coverage.svg?branch=master)](http://codecov.io/github/mikearnaldi/matechs-effect)

Matechs Effect is a typescript library inspired by scala's ZIO and Haskell's RIO architecture.

Docs at [https://arnaldimichael.gitbook.io/matechs-effect/](https://arnaldimichael.gitbook.io/matechs-effect/)

It aims to provide a strong foundational block to build typescript code in a more testable and standardized way.

Interesting integrations and usage examples can be found in 
- `packages/orm`
- `packages/http`
- `packages/rpc`
- `packages/tracing`
- `packages/express`
- `packages/graceful`
- `packages/rxjs`
- `packages/effect`
- `packages/epics`

## Details

For details about the additional types and overloads please refer to documentation in `packages/effect`

## Notes

This package is a work in progress syntax and functions might change, feedback are welcome and contributions even more!

## Stability Grid
|      Package                  | API Stage  | Used in Prod |                                                                   |
|-------------------------------|------------|--------------|-------------------------------------------------------------------|
| @matechs/effect               |   stable   |      yes     | Core package provides all the primitives for effect management.   |
| @matechs/http-client          |   stable   |      yes     | Http client specification and shared utilities for http requests. |
| @matechs/http-client-fetch    |   stable   |      yes     | Http client implementation using a generic fetch instance.        |
| @matechs/http-client-libcurl  |   stable   |      yes     | Http client implementation using libcurl, supports http2 on node. |
| @matechs/browser              |   stable   |      yes     | Deals with reading and writing to browser local & sesstion store. |
| @matechs/console              |   stable   |      yes     | Effectified version of node & browser console.                    |
| @matechs/rxjs                 |   stable   |      yes     | Integrates RxJS with streams, effect and rx pipe operators.       |
| @matechs/epics                |   beta     |      no      | Integrate redux-observable epics in terms of effectful streams.   |
| @matechs/rpc                  |   beta     |      yes     | Wire serializable free modules to express for remote consumption. |
| @matechs/rpc-client           |   beta     |      yes     | Implement server RPC defined free modules in terms of http client.|
| @matechs/orm                  |   stable   |      yes     | Integrates with TypeORM allowing multi database manage smmothly.  |
| @matechs/cqrs                 |   beta     |      no      | Embeds feature complete CQRS+ES utility to ORM for PostgreSQL.    |
| @matechs/express              |   beta     |      yes     | Integrates with express and provide utilities to define routes.   |
| @matechs/tracing              |   beta     |      yes     | Integrates with opentracing-js featuring auto tracing of free mod.|
| @matechs/graceful             |   beta     |      yes     | Utility to register callbacks to improve graceful exit scenarios. |
| @matechs/logger               |   stable   |      yes     | Define a generic logger interface and provide a console interpret.|
| @matechs/logger-winston       |   stable   |      yes     | Integrates logger with a winston based interpreter.               |
| @matechs/uuid                 |   beta     |      yes     | Generates v4 uuids with different encodings, classic & short.     |

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
