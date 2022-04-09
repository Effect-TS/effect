import { STMEffect } from "@effect/core/stm/STM/definition/primitives";

/**
 * Returns the fiber id of the fiber committing the transaction.
 *
 * @tsplus static ets/STM/Ops fiberId
 */
export const fiberId: USTM<FiberId> = new STMEffect((_, fiberId) => fiberId);
