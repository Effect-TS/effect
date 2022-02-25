import type { NonEmptyArray } from "../../../collection/immutable/NonEmptyArray"
import * as NA from "../../../collection/immutable/NonEmptyArray"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Feeds elements of type `A` to `f` in parallel and accumulates all errors,
 * discarding the successes.
 *
 * @tsplus static ets/EffectOps validateParDiscard
 */
export function validateParDiscard<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, X>,
  __tsplusTrace?: string
): Effect<R, NonEmptyArray<E>, void> {
  return Effect.partitionPar(as, f).flatMap(({ tuple: [es, bs] }) =>
    es.isEmpty()
      ? Effect.unit
      : Effect.fail(NA.prepend_(es.tail().toArray(), es.unsafeFirst()!))
  )
}
