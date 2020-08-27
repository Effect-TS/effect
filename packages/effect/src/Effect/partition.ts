import { identity } from "../Function"
import * as I from "../Iterable"
import type { Separated } from "../Utils"
import type { Effect } from "./effect"
import { either } from "./either"
import { foreach_ } from "./foreach_"
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
