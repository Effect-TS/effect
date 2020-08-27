import { identity } from "../Function"
import * as I from "../Iterable"
import type { Separated } from "../Utils"
import type { AsyncRE, Effect } from "./effect"
import { either } from "./either"
import { foreach_ } from "./foreach_"
import { foreachPar_ } from "./foreachPar_"
import { map_ } from "./map_"

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a separated fashion.
 */
export function partition<A, S, R, E, B>(f: (a: A) => Effect<S, R, E, B>) {
  return (as: Iterable<A>): Effect<S, R, never, Separated<Iterable<E>, Iterable<B>>> =>
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
export function partitionPar<A, S, R, E, B>(f: (a: A) => Effect<S, R, E, B>) {
  return (as: Iterable<A>): AsyncRE<R, never, Separated<Iterable<E>, Iterable<B>>> =>
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
  return <A, S, R, E, B>(f: (a: A) => Effect<S, R, E, B>) => (
    as: Iterable<A>
  ): AsyncRE<R, never, Separated<Iterable<E>, Iterable<B>>> =>
    map_(
      foreachPar_(as, (a) => either(f(a))),
      I.partitionMap(identity)
    )
}
