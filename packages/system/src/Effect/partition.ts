// ets_tracing: off

import type * as Tp from "../Collections/Immutable/Tuple/index.js"
import { identity } from "../Function/index.js"
import * as I from "../Iterable/index.js"
import type { Effect, RIO } from "./effect.js"
import { either } from "./either.js"
import { forEach_, forEachPar_, forEachParN_ } from "./excl-forEach.js"
import { map_ } from "./map.js"

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a separated fashion.
 *
 * @ets_data_first partition_
 */
export function partition<A, R, E, B>(f: (a: A) => Effect<R, E, B>, __trace?: string) {
  return (as: Iterable<A>): RIO<R, Tp.Tuple<[Iterable<E>, Iterable<B>]>> =>
    partition_(as, f, __trace)
}

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a separated fashion.
 */
export function partition_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): RIO<R, Tp.Tuple<[Iterable<E>, Iterable<B>]>> {
  return map_(
    forEach_(as, (a) => either(f(a)), __trace),
    I.partitionMap(identity)
  )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * @ets_data_first partitionPar_
 */
export function partitionPar<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>): Effect<R, never, Tp.Tuple<[Iterable<E>, Iterable<B>]>> =>
    partitionPar_(as, f, __trace)
}

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 */
export function partitionPar_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, never, Tp.Tuple<[Iterable<E>, Iterable<B>]>> {
  return map_(
    forEachPar_(as, (a) => either(f(a)), __trace),
    I.partitionMap(identity)
  )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 *
 * @ets_data_first partitionParN_
 */
export function partitionParN<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): (as: Iterable<A>) => Effect<R, never, Tp.Tuple<[Iterable<E>, Iterable<B>]>> {
  return (as) => partitionParN_(as, n, f, __trace)
}

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 */
export function partitionParN_<A, R, E, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, never, Tp.Tuple<[Iterable<E>, Iterable<B>]>> {
  return map_(
    forEachParN_(as, n, (a) => either(f(a)), __trace),
    I.partitionMap(identity)
  )
}
