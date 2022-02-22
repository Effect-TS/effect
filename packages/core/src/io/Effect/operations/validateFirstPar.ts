import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @tsplus static ets/EffectOps validateFirstPar
 */
export function validateFirstPar<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, Chunk<E>, B> {
  return Effect.forEachPar(as, (a) => f(a).flip()).flip()
}
