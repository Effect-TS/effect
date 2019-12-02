# Introduction

[![Coverage Status](https://coveralls.io/repos/github/mikearnaldi/matechs-effect/badge.svg?branch=master)](https://coveralls.io/github/mikearnaldi/matechs-effect?branch=master)

Matechs Effect is a typescript library inspired by scala's ZIO and Haskell's RIO architecture.

Docs at [https://mikearnaldi.github.io/matechs-effect/](https://mikearnaldi.github.io/matechs-effect/)

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

## Ecosystem

- `@matechs/orm` : provides integration with typeorm
- `@matechs/http` : provides integration with axios
- `@matechs/rpc` : no boilerplate rpc for your effects
- `@matechs/tracing` : provides integration with opentracing-js
- `@matechs/express`: provides integration with express
- `@matechs/graceful` : utility to handle graceful exit
- `@matechs/rxjs` : provides integration with rxjs
- `@matechs/effect` : core provides `Effect, Managed, Stream, Ref, Queue, Semaphore`
- `@matechs/epics` : provides integration with redux-observable

## Thanks

This library would have not been feasibly possible without the strong foundations of [fp-ts](https://github.com/gcanti/fp-ts) and [Waveguide](https://github.com/rzeigler/waveguide) from which we have forked the base bifunctor and execution runtime, huge thanks to the Authors.

This library was initially based on Fluture, huge thanks to the Authors.

Another huge thanks goes to both the scala community (ZIO in specific) and the haskell community (RIO & Polysemy) from which inspiration is taken.

All of the above projects are advised!
