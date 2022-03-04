import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @tsplus static ets/STMOps validateFirst
 */
export function validateFirst<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => STM<R, E, B>
): STM<R, Chunk<E>, B> {
  return STM.forEach(as, (a) => f(a).flip()).flip()
}
