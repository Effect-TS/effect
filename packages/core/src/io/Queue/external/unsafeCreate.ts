import type { AtomicBoolean } from "../../../support/AtomicBoolean"
import type { MutableQueue } from "../../../support/MutableQueue"
import { unsafeCreateQueue } from "../../Effect/operations/excl-forEach"
import type { Promise } from "../../Promise"
import type { Queue } from "../definition"
import type { Strategy } from "../operations/strategy"

/**
 * Unsafely creates a new `Queue` using the provided `Strategy`.
 *
 * @tsplus static ets/QueueOps unsafeCreate
 */
export const unsafeCreate: <A>(
  queue: MutableQueue<A>,
  takers: MutableQueue<Promise<never, A>>,
  shutdownHook: Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
) => Queue<A> = unsafeCreateQueue
