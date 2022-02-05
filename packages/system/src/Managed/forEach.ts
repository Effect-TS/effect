// ets_tracing: off

import { unzip } from "../Collections/Immutable/Chunk/api/unzip.js"
import * as Chunk from "../Collections/Immutable/Chunk/core.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import type { ExecutionStrategy } from "../Effect/ExecutionStrategy.js"
import { sequential } from "../Effect/ExecutionStrategy.js"
import { makeManagedReleaseMap, mapM_ } from "./core.js"
import * as T from "./deps.js"
import type { Managed } from "./managed.js"
import { managedApply } from "./managed.js"
import type { Finalizer } from "./ReleaseMap/finalizer.js"
/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `forEachPar`.
 * If you do not need the results, see `forEachUnit` for a more efficient implementation.
 *
 * @ets_data_first forEach_
 */
export function forEach<R, E, A, B>(f: (a: A) => Managed<R, E, B>, __trace?: string) {
  return (as: Iterable<A>) => forEach_(as, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `forEachPar_`.
 * If you do not need the results, see `forEachUnit_` for a more efficient implementation.
 */
export function forEach_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
) {
  return managedApply<R, E, Chunk.Chunk<B>>(
    T.map_(
      T.forEach_(as, (a) => f(a).effect, __trace),
      (res) => {
        const fins = Chunk.map_(res, (k) => k.get(0))
        const as = Chunk.map_(res, (k) => k.get(1))

        return Tp.tuple(
          (e) => T.forEach_(Chunk.reverse(fins), (fin) => fin(e), __trace),
          as
        )
      }
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 */
export function forEachExec_<R, E, A, B>(
  as: Iterable<A>,
  es: ExecutionStrategy,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
) {
  switch (es._tag) {
    case "Sequential": {
      return forEach_(as, f, __trace)
    }
    case "Parallel": {
      return forEachPar_(as, f, __trace)
    }
    case "ParallelN": {
      return forEachParN_(as, es.n, f, __trace)
    }
  }
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @ets_data_first forEachExec_
 */
export function forEachExec<R, E, A, B>(
  es: ExecutionStrategy,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>) => forEachExec_(as, es, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects sequentially.
 *
 * Equivalent to `forEach(as)(f).unit`, but without the cost of building
 * the list of results.
 */
export function forEachUnit_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
) {
  return managedApply<R, E, void>(
    T.map_(
      T.forEach_(as, (a) => f(a).effect, __trace),
      (result) => {
        const {
          tuple: [fins]
        } = unzip(result)
        return Tp.tuple<[Finalizer, void]>(
          (e) => T.forEach_(Chunk.reverse(fins), (f) => f(e), __trace),
          undefined
        )
      }
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects sequentially.
 *
 * Equivalent to `forEach(as)(f).unit`, but without the cost of building
 * the list of results.
 *
 * @ets_data_first forEachUnit_
 */
export function forEachUnit<R, E, A, B>(
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>) => forEachUnit_(as, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @ets_data_first forEachPar_
 */
export function forEachPar<R, E, A, B>(
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>): Managed<R, E, Chunk.Chunk<B>> => forEachPar_(as, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `forEach_`.
 */
export function forEachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
): Managed<R, E, Chunk.Chunk<B>> {
  return mapM_(makeManagedReleaseMap(T.parallel, __trace), (parallelReleaseMap) => {
    const makeInnerMap = T.provideSome_(
      T.map_(makeManagedReleaseMap(sequential).effect, ({ tuple: [_, x] }) => x),
      (x: unknown) => Tp.tuple(x, parallelReleaseMap)
    )

    return T.forEachPar_(as, (a) =>
      T.map_(
        T.chain_(makeInnerMap, (innerMap) =>
          T.provideSome_(f(a).effect, (u: R) => Tp.tuple(u, innerMap))
        ),
        ({ tuple: [_, b] }) => b
      )
    )
  })
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `forEachPar`, this method will use at most up to `n` fibers.
 *
 * @ets_data_first forEachParN_
 */
export function forEachParN<R, E, A, B>(
  n: number,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>): Managed<R, E, Chunk.Chunk<B>> =>
    forEachParN_(as, n, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `forEachPar_`, this method will use at most up to `n` fibers.
 */
export function forEachParN_<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
): Managed<R, E, Chunk.Chunk<B>> {
  return mapM_(makeManagedReleaseMap(T.parallelN(n), __trace), (parallelReleaseMap) => {
    const makeInnerMap = T.provideSome_(
      T.map_(makeManagedReleaseMap(sequential).effect, ({ tuple: [_, x] }) => x),
      (x: unknown) => Tp.tuple(x, parallelReleaseMap)
    )

    return T.forEachParN_(as, n, (a) =>
      T.map_(
        T.chain_(makeInnerMap, (innerMap) =>
          T.provideSome_(f(a).effect, (u: R) => Tp.tuple(u, innerMap))
        ),
        ({ tuple: [_, b] }) => b
      )
    )
  })
}
