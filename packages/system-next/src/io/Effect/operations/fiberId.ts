import type { FiberId } from "../../FiberId"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns the `FiberId` of the fiber executing the effect that calls this
 * method.
 *
 * @tsplus static ets/EffectOps fiberId
 */
export const fiberId: UIO<FiberId> = Effect.descriptor.map((_) => _.id)
