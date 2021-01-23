import { identity } from "../Function"
import * as I from "../Iterable"
import type { Separated } from "../Utils"
import type { Effect, RIO } from "./effect"
import { either } from "./either"
import { foreach_, foreachPar_, foreachParN_ } from "./foreach"
import { map_ } from "./map"

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a separated fashion.
 */
export function partition<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>): RIO<R, Separated<Iterable<E>, Iterable<B>>> =>
    map_(
      foreach_(as, (a) => either(f(a))),
      I.partitionMap(identity)
    )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 */
export function partitionPar<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>): Effect<R, never, Separated<Iterable<E>, Iterable<B>>> =>
    map_(
      foreachPar_(as, (a) => either(f(a))),
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
export function partitionParN(n: number) {
  return <A, R, E, B>(f: (a: A) => Effect<R, E, B>) => (
    as: Iterable<A>
  ): Effect<R, never, Separated<Iterable<E>, Iterable<B>>> =>
    map_(
      foreachParN_(as, n, (a) => either(f(a))),
      I.partitionMap(identity)
    )
}
