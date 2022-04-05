import { unsafeCreateQueue } from "@effect-ts/core/io/Effect/operations/excl-forEach";
import type { Strategy } from "@effect-ts/core/io/Queue/operations/strategy";

/**
 * Unsafely creates a new `Queue` using the provided `Strategy`.
 *
 * @tsplus static ets/Queue/Ops unsafeCreate
 */
export const unsafeCreate: <A>(
  queue: MutableQueue<A>,
  takers: MutableQueue<Deferred<never, A>>,
  shutdownHook: Deferred<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
) => Queue<A> = unsafeCreateQueue;
