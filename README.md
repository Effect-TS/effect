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
|      Package                  | API Stage  | Used in Prod |
|-------------------------------|------------|--------------|
| @matechs/effect               |   stable   |      yes     |
| @matechs/http-client          |   stable   |      yes     |
| @matechs/http-client-fetch    |   stable   |      yes     |
| @matechs/http-client-libcurl  |   stable   |      yes     |
| @matechs/browser              |   stable   |      yes     |
| @matechs/rxjs                 |   stable   |      yes     |
| @matechs/epics                |   alpha    |      no      |
| @matechs/express              |   alpha    |      no      |
| @matechs/rpc                  |   alpha    |      no      |
| @matechs/orm                  |   beta     |      yes     |
| @matechs/express              |   alpha    |      no      |
| @matechs/tracing              |   poc      |      no      |

## Ecosystem

- `@matechs/orm` : provides integration with typeorm
- `@matechs/http-client` : functional http client, integrations available `libcurl & fetch`
- `@matechs/rpc` : no boilerplate rpc for your effects
- `@matechs/tracing` : provides integration with opentracing-js
- `@matechs/express`: provides integration with express
- `@matechs/rxjs` : provides integration with rxjs
- `@matechs/effect` : core provides `Effect, Managed, Stream, Ref, Queue, Semaphore`
- `@matechs/epics` : provides integration with redux-observable
- `@matechs/cloud` : provides utilities to orchestrate tasks and cluster singletons 

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
