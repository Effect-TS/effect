# Introduction
Matechs Effect is a typescript library inspired by scala's ZIO and Haskell's RIO architecture.

Docs at [https://mikearnaldi.github.io/matechs-effect/modules/_matechs_effect.html](https://mikearnaldi.github.io/matechs-effect/modules/_matechs_effect.html)

It aims to provide a strong fundational block to build typescript code in a more testable and standardized way.

This library is composed at its core by the `@matechs/effect` package that exposes 2 effects

- `type Effect<R, E, A> = (r: R) => FutureInstance<E, A>`

The underlying `FutureInstance` is provided by `Fluture`.

You can think of this type as a computation that requires an environment `R` to run.

An important point to note in the implementation is the `src/overload.ts` file where we extend and define the new abstract types required to specialize `fp-ts` behaviour to respect the variance of `R` & `E`.

The key difference is expressed in:
```
export interface Chain3E<F extends URIS3> extends Apply3<F> {
  readonly chain: <R, E, A, R2, E2, B>(
    fa: Kind3<F, R, E, A>,
    f: (a: A) => Kind3<F, R2, E2, B>
  ) => Kind3<F, R & R2, E | E2, B>;
}

export interface Monad3E<M extends URIS3> extends Applicative3<M>, Chain3E<M> {}

export interface PipeableChain3E<F extends URIS3> extends PipeableApply3E<F> {
  readonly chain: <R, E, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => <R2, E2>(ma: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, B>;
  readonly chainFirst: <R, E, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => <R2, E2>(ma: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, A>;
  readonly flatten: <R, E, R2, E2, A>(
    mma: Kind3<F, R, E, Kind3<F, R2, E2, A>>
  ) => Kind3<F, R & R2, E | E2, A>;
}

export interface PipeableApply3E<F extends URIS3> extends PipeableFunctor3<F> {
  readonly ap: <R, E, A, R2, E2>(
    fa: Kind3<F, R, E, A>
  ) => <B>(fab: Kind3<F, R2, E2, (a: A) => B>) => Kind3<F, R & R2, E | E2, B>;
  readonly apFirst: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2, E2>(fa: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, A>;
  readonly apSecond: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A, R2, E2>(fa: Kind3<F, R2, E2, A>) => Kind3<F, R & R2, E | E2, B>;
}

export interface Apply3E<F extends URIS3> extends Functor3<F> {
  readonly ap: <R, E, A, B, R2, E2>(
    fab: Kind3<F, R, E, (a: A) => B>,
    fa: Kind3<F, R2, E2, A>
  ) => Kind3<F, R & R2, E | E2, B>;
}
```

In addition to that the `fp-ts-contrib/lib/Do` module has similar overloads. This workaround is necessary because typescript's lack of variance annotation on generics.

The module exposes 2 instances of the typeclass `type EffectMonad<T extends URIS3> = Monad3E<T> & MonadThrow3<T> & Bifunctor3<T>`:

- `effectMonad` for `Effect<R, E, A>`
- `concurrentEffectMonad` for `Effect<R, E, A>` provides concurrent `ap`

Pipeable functions are also exported for both instances (default `Effect`, `parAp`, `parApFirst`, `parApSecond` for parallel)

In addition to default implementations additional exposed functions are:
```
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

## Notes
This package is a work in progress syntax and functions might change, feedback are welcome and contributions even more!

## Thanks
This library would have not been feasibly possible without the strong fundations of [fp-ts](https://github.com/gcanti/fp-ts) and [Fluture](https://github.com/fluture-js/Fluture) huge thanks to the Authors.

Another huge thanks goes to both the scala community (ZIO in specific) and the haskell community (RIO & Polysemy) from which inspiration is taken.

All of the above projects are advised!