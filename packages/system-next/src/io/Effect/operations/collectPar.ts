import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @tsplus static ets/EffectOps collectPar
 */
export function collectPar_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, Option<E>, B>,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.forEachPar(as, (a) => f(a).unsome()).map((chunk) => chunk.compact())
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @ets_data_first collectPar_
 */
export function collectPar<A, R, E, B>(
  f: (a: A) => Effect<R, Option<E>, B>,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Effect<R, E, Chunk<B>> => Effect.collectPar(as, f)
}
