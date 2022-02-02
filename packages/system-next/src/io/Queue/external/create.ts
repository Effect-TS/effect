import type { MutableQueue } from "../../../support/MutableQueue"
import type { UIO } from "../../Effect"
import { createQueue } from "../../Effect/operations/excl-forEach"
import type { Queue } from "../definition"
import type { Strategy } from "../operations/strategy"

export { createQueue } from "../../Effect/operations/excl-forEach"

/**
 * Creates a new `Queue` using the provided `Strategy`.
 *
 * @tsplus static ets/QueueOps create
 */
export const create: <A>(
  queue: MutableQueue<A>,
  strategy: Strategy<A>,
  __etsTrace?: string | undefined
) => UIO<Queue<A>> = createQueue
