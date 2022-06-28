import { unsafeCreateQueue } from "@effect/core/io/Effect/operations/excl-forEach"
import type { Strategy } from "@effect/core/io/Queue/operations/strategy"

/**
 * Unsafely creates a new `Queue` using the provided `Strategy`.
 *
 * @tsplus static effect/core/io/Queue.Ops unsafeCreate
 */
export const unsafeCreate: <A>(
  queue: MutableQueue<A>,
  takers: MutableQueue<Deferred<never, A>>,
  shutdownHook: Deferred<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
) => Queue<A> = unsafeCreateQueue
