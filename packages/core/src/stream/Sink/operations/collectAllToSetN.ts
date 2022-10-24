import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * A sink that collects first `n` distinct inputs into a set.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllToSetN
 * @category constructors
 * @since 1.0.0
 */
export function collectAllToSetN<In>(
  n: number
): Sink<never, never, In, In, HashSet.HashSet<In>> {
  return Sink.foldWeighted(
    HashSet.empty<In>(),
    (set, input) => pipe(set, HashSet.has(input)) ? 0 : 1,
    n,
    (set, input) => pipe(set, HashSet.add(input))
  )
}
