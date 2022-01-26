import { Effect } from "../../Effect"
import type { FiberId } from "../../FiberId/definition"
import { Managed } from "../definition"

/**
 * Returns an effect that succeeds with the `FiberId` of the caller.
 *
 * @ets static ets/ManagedOps fiberId
 */
export const fiberId: Managed<unknown, never, FiberId> = Managed.fromEffect(
  Effect.fiberId
)
