# Introduction

[![codecov.io](http://codecov.io/github/mikearnaldi/matechs-effect/coverage.svg?branch=master)](http://codecov.io/github/mikearnaldi/matechs-effect)

Matechs Effect is a typescript library inspired by scala's ZIO and Haskell's RIO architecture.

Docs at [https://mikearnaldi.github.io/matechs-effect/](https://mikearnaldi.github.io/matechs-effect/)

It aims to provide a strong foundational block to build typescript code in a more testable and standardized way.

This library is composed at its core by the `@matechs/effect` package that exposes 2 effects

- `type Effect<R, E, A> = (r: R) => Wave<E, A>`

The underlying `Wave` is provided by `Waveguide`.

You can think of this type as a computation that requires an environment `R` to run.

The module exposes 2 instances of the typeclass `type EffectMonad<T extends URIS3> = Monad3E<T> & MonadThrow3<T> & Bifunctor3<T>`:

- `effectMonad` for `Effect<R, E, A>`
- `concurrentEffectMonad` for `Effect<R, E, A>` provides concurrent `ap`

Pipeable functions are also exported for both instances (default `Effect`, `parAp`, `parApFirst`, `parApSecond` for parallel)

Interesting integrations and usage examples can be found in `packages/orm`, `packages/http`, `packages/rpc`, `packages/tracing`

## Details

For details about the additional types and overloads please refer to documentation in `packages/effect`

## Notes

This package is a work in progress syntax and functions might change, feedback are welcome and contributions even more!

The primary difference with waveguide itself is in how we manage the `R` parameter and in the utilities that we provide around environment management. The focus on this library is making environmental effects easy while providing valuable integrations out of the box where `Waveguide` itself poses primary focus around the underlying `Wave<E, A>`

## Ecosystem

- `@matechs/tracing` : provides integration with opentracing-js
- `@matechs/http` : provides integration with axios
- `@matechs/orm` : provides integration with typeorm
- `@matechs/rpc` : no boilerplate rpc for your effects
- `@matechs/express` : provides integration with express
- `@matechs/graceful` : utility to handle graceful exit

## Thanks

This library would have not been feasibly possible without the strong foundations of [fp-ts](https://github.com/gcanti/fp-ts) and [Waveguide](https://github.com/rzeigler/waveguide) & huge thanks to the Authors.

This library was initially based on Fluture, huge thanks to the Authors.

Another huge thanks goes to both the scala community (ZIO in specific) and the haskell community (RIO & Polysemy) from which inspiration is taken.

All of the above projects are advised!
