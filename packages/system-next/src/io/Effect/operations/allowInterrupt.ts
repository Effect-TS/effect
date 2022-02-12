import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Makes an explicit check to see if the fiber has been interrupted, and if
 * so, performs self-interruption
 *
 * @tsplus static ets/EffectOps allowInterrupt
 */
export const allowInterrupt: UIO<void> = Effect.descriptorWith((descriptor) =>
  descriptor.interrupters.size > 0 ? Effect.interrupt : Effect.unit
)
