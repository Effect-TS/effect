import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases.
 *
 * @tsplus static ets/STMOps collect
 */
export function collect<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => STM<R, Option<E>, B>
): STM<R, E, Chunk<B>> {
  return STM.forEach(as, (a) => f(a).unsome()).map((chunk) => chunk.compact())
}
