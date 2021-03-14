// tracing: off

import { identity } from "../Function"
import * as I from "../Iterable"
import type { Separated } from "../Utils"
import type { Effect, RIO } from "./effect"
import { either } from "./either"
import { forEach_, forEachPar_, forEachParN_ } from "./excl-forEach"
import { map_ } from "./map"

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a separated fashion.
 *
 * @dataFirst partition_
 */
export function partition<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>): RIO<R, Separated<Iterable<E>, Iterable<B>>> =>
    map_(
      forEach_(as, (a) => either(f(a))),
      I.partitionMap(identity)
    )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a separated fashion.
 */
export function partition_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): RIO<R, Separated<Iterable<E>, Iterable<B>>> {
  return map_(
    forEach_(as, (a) => either(f(a))),
    I.partitionMap(identity)
  )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * @dataFirst partitionPar_
 */
export function partitionPar<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>): Effect<R, never, Separated<Iterable<E>, Iterable<B>>> =>
    map_(
      forEachPar_(as, (a) => either(f(a))),
      I.partitionMap(identity)
    )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 */
export function partitionPar_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, never, Separated<Iterable<E>, Iterable<B>>> {
  return map_(
    forEachPar_(as, (a) => either(f(a))),
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
 * @dataFirst partitionParN_
 */
export function partitionParN<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>
): (as: Iterable<A>) => Effect<R, never, Separated<Iterable<E>, Iterable<B>>> {
  return (as) =>
    map_(
      forEachParN_(as, n, (a) => either(f(a))),
      I.partitionMap(identity)
    )
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
  f: (a: A) => Effect<R, E, B>
): Effect<R, never, Separated<Iterable<E>, Iterable<B>>> {
  return map_(
    forEachParN_(as, n, (a) => either(f(a))),
    I.partitionMap(identity)
  )
}
