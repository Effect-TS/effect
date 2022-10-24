import { partitionMap } from "@effect/core/io/Effect/operations/_internal/partitionMap"
import { identity } from "@fp-ts/data/Function"
import type { List } from "@fp-ts/data/List"

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in parallel and returns the result as a
 * tuple.
 *
 * @tsplus static effect/core/io/Effect.Ops partitionPar
 */
export function partitionPar<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, never, readonly [List<E>, List<B>]> {
  return Effect.forEachPar(as, (a) => f(a).either).map((chunk) => partitionMap(chunk, identity))
}
