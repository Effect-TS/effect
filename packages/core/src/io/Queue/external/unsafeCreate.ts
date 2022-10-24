import { unsafeCreateQueue } from "@effect/core/io/Effect/operations/excl-forEach"
import type { Strategy } from "@effect/core/io/Queue/operations/strategy"
import type { MutableQueue } from "@fp-ts/data/mutable/MutableQueue"
import type { MutableRef } from "@fp-ts/data/mutable/MutableRef"

/**
 * Unsafely creates a new `Queue` using the provided `Strategy`.
 *
 * @tsplus static effect/core/io/Queue.Ops unsafeCreate
 * @category constructors
 * @since 1.0.0
 */
export const unsafeCreate: <A>(
  queue: MutableQueue<A>,
  takers: MutableQueue<Deferred<never, A>>,
  shutdownHook: Deferred<never, void>,
  shutdownFlag: MutableRef<boolean>,
  strategy: Strategy<A>
) => Queue<A> = unsafeCreateQueue
