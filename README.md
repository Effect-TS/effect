# Introduction

[![codecov.io](http://codecov.io/github/mikearnaldi/matechs-effect/coverage.svg?branch=master)](http://codecov.io/github/mikearnaldi/matechs-effect)

Matechs Effect is a typescript library inspired by scala's ZIO and Haskell's RIO architecture.

Docs at [https://mikearnaldi.github.io/matechs-effect/](https://mikearnaldi.github.io/matechs-effect/)

It aims to provide a strong fundational block to build typescript code in a more testable and standardized way.

This library is composed at its core by the `@matechs/effect` package that exposes 2 effects

- `type Effect<R, E, A> = (r: R) => FutureInstance<E, A>`

The underlying `FutureInstance` is provided by `Fluture`.

You can think of this type as a computation that requires an environment `R` to run.

The module exposes 2 instances of the typeclass `type EffectMonad<T extends URIS3> = Monad3E<T> & MonadThrow3<T> & Bifunctor3<T>`:

- `effectMonad` for `Effect<R, E, A>`
- `concurrentEffectMonad` for `Effect<R, E, A>` provides concurrent `ap`

Pipeable functions are also exported for both instances (default `Effect`, `parAp`, `parApFirst`, `parApSecond` for parallel)

In addition to default implementations additional exposed functions are:

```ts
/* utils */
export function error(message: string) {
  return new Error(message);
}

/* lift functions */

export function fromFuture<E, A>(f: F.FutureInstance<E, A>): Effect<NoEnv, E, A>

export function right<A>(a: A): Effect<NoEnv, NoErr, A>

export function left<E>(e: E): Effect<NoEnv, E, never>

export function liftPromise<A, E>(f: () => Promise<A>): Effect<NoEnv, never, A>

export function liftIO<A>(f: () => A): Effect<NoEnv, never, A>

export function tryCatch<A, E>(f: () => Promise<A>, onLeft: (e: any) => E)

export function tryCatchIO<A, E>(f: () => A, onLeft: (e: any) => E)

export function chainLeft<R, E, E2, A, R2>(ma: Effect<R, E, A>,onLeft: (e: E) => Effect<R2, E2, A>)

/* conditionals */

// run only when predicate is true, return in Option
export function when(predicate: boolean): <R, E, A>(ma: Effect<R, E, A>) => Effect<R, E, Op.Option<A>>

// same as alt but types are different so we return in Either
export function or(predicate: boolean): <R, E, A>(ma: Effect<R, E, A>) => <R2, E2, B>(mb: Effect<R2, E2, B>) => Effect<R & R2, E | E2, Ei.Either<A, B>>

// decide what to run depending on a boolean, both side returns same type
export function alt(predicate: boolean): <R, E, A>(ma: Effect<R, E, A>) => (mb: Effect<R, E, A>) => Effect<R, E, A>

/* manipulate environment */

export const noEnv = {}; // unit

export function mergeEnv<A, B>(a: A): (b: B) => A & B // merge 2 environments

export const provide = <R>(r: R) => <R2, E, A>(ma: Effect<R2 & R, E, A>): Effect<R2, E, A> // provide environment to an effect


/* use environment */
export function accessM<R, R2, E, A>(f: (r: R) => Effect<R2, E, A>): Effect<R & R2, E, A>

export function access<R, A>(f: (r: R) => A): Effect<R, NoErr, A>

/* parallel */

export function sequenceP<R, E, A>(n: number, ops: Array<Effect<R, E, A>>): Effect<R, E, Array<A>>


/* execution */

/* run an effect that requires no environment, return TaskEither */
function run<E, A>(ma: Effect<NoEnv, E, A>): () => Promise<Ei.Either<E, A>>

/* run an effect that requires no environment, return Promise(reject on error) */
promise<A>(ma: Effect<NoEnv, any, A>): Promise<A>

/* run an effect that requires no environment, return underlying Fluture fork */
fork<A, E>(res: (a: A) => void, rej: (e: E) => void): (ma: Effect<NoEnv, E, A>) => Cancel
```

Interesting integrations and usage examples can be found in `packages/orm`, `packages/http`, `packages/rpc`, `packages/tracing`

## Details

For details about the additional types and overloads please refer to documentation in `packages/effect`

## Notes

This package is a work in progress syntax and functions might change, feedback are welcome and contributions even more!

## Ecosystem

- `@matechs/tracing` : provides integration with opentracing-js
- `@matechs/http` : provides integration with axios
- `@matechs/orm` : provides integration with typeorm
- `@matechs/rpc` : no boilerplate rpc for your effects

## Thanks

This library would have not been feasibly possible without the strong fundations of [fp-ts](https://github.com/gcanti/fp-ts) and [Fluture](https://github.com/fluture-js/Fluture) huge thanks to the Authors.

Another huge thanks goes to both the scala community (ZIO in specific) and the haskell community (RIO & Polysemy) from which inspiration is taken.

All of the above projects are advised!
