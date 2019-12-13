# Introduction

[![codecov.io](http://codecov.io/github/mikearnaldi/matechs-effect/coverage.svg?branch=master)](http://codecov.io/github/mikearnaldi/matechs-effect)

Matechs Effect is a typescript library inspired by scala's ZIO and Haskell's RIO architecture.

Docs at [https://mikearnaldi.github.io/matechs-effect/](https://mikearnaldi.github.io/matechs-effect/)

Git book with user manual at [https://arnaldimichael.gitbook.io/matechs-effect/](https://arnaldimichael.gitbook.io/matechs-effect/) (work in progress)

It aims to provide a strong foundational block to build typescript code in a more testable and standardized way.

This library is composed at its core by the `@matechs/effect` package that exposes:
- trifunctor `Effect<R, E, A>`, istances `effectMonad` & `concurrentEffectMonad`
- trifunctor `Managed<R, E, A>`, istances `managedMonad`
- trifunctor `Stream<R, E, A>`, instances `streamMonad`

You can think of this types as a computations that requires an environment `R` to run.

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

Currently the benchmarks show:
```
Fibonacci:
$ /home/runner/work/matechs-effect/matechs-effect/node_modules/.bin/ts-node bench/index.ts
effect x 20,174 ops/sec ±1.06% (83 runs sampled)
qio x 17,963 ops/sec ±2.95% (81 runs sampled)
wave x 13,876 ops/sec ±1.37% (79 runs sampled)
native x 27,125 ops/sec ±1.83% (81 runs sampled)
Fastest is native

Nested Map 100
$ /home/runner/work/matechs-effect/matechs-effect/node_modules/.bin/ts-node bench/nestedMap.ts
effect x 8,431 ops/sec ±1.78% (78 runs sampled)
wave x 3,211 ops/sec ±1.08% (81 runs sampled)
qio x 7,095 ops/sec ±3.24% (69 runs sampled)
Fastest is effect

Nested Chain 1000
$ /home/runner/work/matechs-effect/matechs-effect/node_modules/.bin/ts-node bench/nestedChain.ts
effect x 772 ops/sec ±2.81% (78 runs sampled)
wave x 436 ops/sec ±1.23% (81 runs sampled)
qio x 707 ops/sec ±1.48% (82 runs sampled)
Fastest is effect
```

## Thanks

This library would have not been feasibly possible without the strong foundations of [fp-ts](https://github.com/gcanti/fp-ts) and [Waveguide](https://github.com/rzeigler/waveguide) from which we have forked the base bifunctor and execution runtime, huge thanks to the Authors.

This library was initially based on Fluture, huge thanks to the Authors.

Another huge thanks goes to both the scala community (ZIO in specific) and the haskell community (RIO & Polysemy) from which inspiration is taken.

All of the above projects are advised!

## Get in touch
The best place to reach out would be either in https://fpchat-invite.herokuapp.com (FP Chat, @Michael Arnaldi) or for italians https://italiajs.herokuapp.com/ (Italia JS, @Michael Arnaldi or channel #fp)
