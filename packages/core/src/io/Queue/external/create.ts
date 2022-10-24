import { createQueue } from "@effect/core/io/Effect/operations/excl-forEach"
import type { Strategy } from "@effect/core/io/Queue/operations/strategy"
import type { MutableQueue } from "@fp-ts/data/mutable/MutableQueue"

export { createQueue } from "@effect/core/io/Effect/operations/excl-forEach"

/**
 * Creates a new `Queue` using the provided `Strategy`.
 *
 * @tsplus static effect/core/io/Queue.Ops create
 * @category constructors
 * @since 1.0.0
 */
export const create: <A>(
  queue: MutableQueue<A>,
  strategy: Strategy<A>
) => Effect<never, never, Queue<A>> = createQueue
