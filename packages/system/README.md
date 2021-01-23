## Welcome to Effect-TS

Effect-TS is a zero dependency set of libraries to write highly productive, purely functional TypeScript at scale.

The main driver of inspiration and the source of most of the ideas politely borrowed by this library is the core [ZIO](https://github.com/zio/zio) and its ecosystem of libraries, in particular [ZIO-Prelude](https://github.com/zio/zio-prelude) from which we take the naming and design of a highly innovative typeclass system.

Within the TypeScript ecosystem, this library takes inspiration from [fp-ts](https://github.com/gcanti/fp-ts), [io-ts](https://github.com/gcanti/fp-ts), [morphic-ts](https://github.com/sledorze/morphic-ts), [waveguide](https://github.com/rzeigler/waveguide), [qio](https://github.com/tusharmath/qio) and please forgive us if we are forgetting some.

Before anything we would like to say THANK YOU to all the contributors and authors of all the libraries we took something from, this work would have not been possible without you!

Just like `ZIO` in scala, which was taken as source-code reference for the typescript port, `@effect-ts/core/Effect` is powered by highly-scalable, non-blocking fibers that never waste or leak resources, `Effect` lets you build scalable, resilient, and reactive applications that meet the needs of your business.

- **High-performance**. Build scalable applications with greater performance compared to `Promise`.
- **Type-safe**. Use the full power of the TypeScript compiler to catch bugs at compile time.
- **Concurrent**. Easily build concurrent apps without deadlocks, race conditions, or complexity.
- **Asynchronous**. Write sequential code that looks the same whether it's asynchronous or synchronous.
- **Resource-safe**. Build apps that never leak resources, even when they fail.
- **Testable**. Inject test services into your app for fast, deterministic, and type-safe testing.
- **Resilient**. Build apps that never lose errors, and which respond to failure locally and flexibly.
- **Functional**. Rapidly compose solutions to complex problems from simple building blocks.
- **Stack Safe**. Forget ever seeing again `Maximum call stack size exceeded` and profit.

Within the ecosystem of packages you will find:

- `@effect-ts/core` The main entry point of the library, contains the effect system, the typeclasses inspired by zio-prelude and a set of commonly used modules like `Sync`, `Array`, `Option`, and many more.

- `@effect-ts/jest` The main entry point for testing, provides an integration to jest of a test runtime based on managed effect layers that support `Effect` as first class citizen.

- `@effect-ts/monocle` Based on a fork of `monocle-ts` experimental modules this library offers low boilerplate optics for your needs.

- `@effect-ts/morphic` Based on a fork of `morphic-ts` this library provides derivation of common typeclasses like `Decoder`, `Encoder`, `Guard` in a highly configurable manner and utilities around `ADT` in general data-modelling needs.

- `@effect-ts/tracing-plugin` This typescript compiler plugin, to be used with `ttypescript`, can be configured to:
  - add compile time traces to your application code
  - reduce the calls to `pipe`
  - reduce the calls to `flow`
  - reduce the calls to `identity`
  - optimize data-last pipeable functions to data-first

## Install

We recommend the usage of `yarn` and if you have multiple packages the usage of `yarn workspaces` that handles by default hoisting of dependencies:

```sh
yarn add @effect-ts/system
```

## Get in touch

Join us using discord at: [https://discord.gg/hdt7t7jpvn](https://discord.gg/hdt7t7jpvn)

## Articles

If you like to know more check out our, incomplete, series of articles:

- [Encoding HKTs in TS4.1](https://dev.to/matechs/encoding-hkts-in-ts4-1-1fn2)
- [Effect-TS Core: ZIO-Prelude Inspired Typeclasses & Module Structure](https://dev.to/matechs/effect-ts-core-zio-prelude-inspired-typeclasses-module-structure-50g6)
- [The Effect Data Types: Effect](https://dev.to/matechs/the-effect-data-types-effect-1e3f)
- [The Effect Data Types: Managed & Layer](https://dev.to/matechs/the-effect-data-types-managed-layer-4722)
- [Abusing TypeScript Generators](https://dev.to/matechs/abusing-typescript-generators-4m5h)

## Documentation

This is not an excuse, we will write docs when the active development slows down but:

Functional libraries tend to have almost no documentation and the reason is that the best documentation for a function is its own definition assuming the name is meaningful and the types are clear.

For the reason above, when we will begin documenting it, it will be along the lines of a guide in order to introduce concepts used in the library rather than just an "online database of function definitions"

## Examples

- AWS Lambda Setup: [https://github.com/Matechs-Garage/effect-ts-lambda](https://github.com/Matechs-Garage/effect-ts-lambda)

## Maintainers

This library is actively maintained by Matechs-Garage the `R&D` leg of the [Matechs](https://www.matechs.com/) group that sponsor its development.

## Contributors

Many thanks to all contributors of this amazing project, many of you have contributed from functionality up to bug reporting and fixing this library would have been nowhere near without your work. If you are interested to join us then reach out (regardless of your experience)!
