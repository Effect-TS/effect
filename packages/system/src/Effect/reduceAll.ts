// ets_tracing: off

import * as A from "../Collections/Immutable/Array/index.js"
import * as NA from "../Collections/Immutable/NonEmptyArray/index.js"
import * as O from "../Option/index.js"
import { suspend } from "./core.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"
import { mergeAllPar_, mergeAllParN_ } from "./mergeAll.js"
import { zipWith_ } from "./zipWith.js"

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working sequentially.
 */
export function reduceAll_<R, E, A>(
  as: NA.NonEmptyArray<Effect<R, E, A>>,
  f: (acc: A, a: A) => A,
  __trace?: string
): Effect<R, E, A> {
  return suspend(
    () => A.reduce_(NA.tail(as), NA.head(as), (acc, a) => zipWith_(acc, a, f)),
    __trace
  )
}

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working sequentially.
 *
 * @ets_data_first reduceAll_
 */
export function reduceAll<A>(f: (acc: A, a: A) => A, __trace?: string) {
  return <R, E>(as: NA.NonEmptyArray<Effect<R, E, A>>) => reduceAll_(as, f, __trace)
}

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working in parallel.
 */
export function reduceAllPar_<R, E, A>(
  as: NA.NonEmptyArray<Effect<R, E, A>>,
  f: (acc: A, a: A) => A,
  __trace?: string
): Effect<R, E, A> {
  return map_(
    mergeAllPar_(
      as,
      <O.Option<A>>O.none,
      (acc, elem) =>
        O.some(
          O.fold_(
            acc,
            () => elem,
            (a) => f(a, elem)
          )
        ),
      __trace
    ),
    O.getOrElse(() => {
      throw new Error("Bug")
    })
  )
}

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working in parallel.
 *
 * @ets_data_first reduceAllPar_
 */
export function reduceAllPar<A>(f: (acc: A, a: A) => A, __trace?: string) {
  return <R, E>(as: NA.NonEmptyArray<Effect<R, E, A>>) => reduceAllPar_(as, f, __trace)
}

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working in up to `n` fibers in parallel.
 */
export function reduceAllParN_<R, E, A>(
  as: NA.NonEmptyArray<Effect<R, E, A>>,
  n: number,
  f: (acc: A, a: A) => A,
  __trace?: string
): Effect<R, E, A> {
  return map_(
    mergeAllParN_(
      as,
      n,
      <O.Option<A>>O.none,
      (acc, elem) =>
        O.some(
          O.fold_(
            acc,
            () => elem,
            (a) => f(a, elem)
          )
        ),
      __trace
    ),
    O.getOrElse(() => {
      throw new Error("Bug")
    })
  )
}

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working in up to `n` fibers in parallel.
 *
 * @ets_data_first reduceAllParN_
 */
export function reduceAllParN<A>(n: number, f: (acc: A, a: A) => A, __trace?: string) {
  return <R, E>(as: NA.NonEmptyArray<Effect<R, E, A>>): Effect<R, E, A> =>
    reduceAllParN_(as, n, f, __trace)
}
