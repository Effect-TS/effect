import type { FiberId } from "../../../io/FiberId"
import type { USTM } from "../definition"
import { STMEffect } from "../definition"

/**
 * Returns the fiber id of the fiber committing the transaction.
 *
 * @tsplus static ets/STMOps fiberId
 */
export const fiberId: USTM<FiberId> = new STMEffect((_, fiberId) => fiberId)
