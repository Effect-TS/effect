import type { NonEmptyArray } from "../../../collection/immutable/NonEmptyArray"
import * as NA from "../../../collection/immutable/NonEmptyArray"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Feeds elements of type `A` to `f` and accumulates all errors, discarding
 * the successes.
 *
 * @tsplus static ets/EffectOps validateDiscard
 */
export function validateDiscard<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, X>,
  __tsplusTrace?: string
): Effect<R, NonEmptyArray<E>, void> {
  return Effect.partition(as, f).flatMap(({ tuple: [es, bs] }) =>
    es.isEmpty()
      ? Effect.unit
      : Effect.fail(NA.prepend_(es.tail().toArray(), es.unsafeFirst()!))
  )
}
