import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @tsplus static ets/EffectOps collectPar
 */
export function collectPar<A, R, E, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, Option<E>, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.forEachPar(as, (a) => f(a).unsome()).map((chunk) => chunk.compact())
}
