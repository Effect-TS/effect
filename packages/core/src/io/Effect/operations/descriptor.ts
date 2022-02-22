import type * as Fiber from "../../Fiber"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns information about the current fiber, such as its identity.
 *
 * @tsplus static ets/EffectOps descriptor
 */
export const descriptor: UIO<Fiber.Descriptor> = Effect.descriptorWith(
  Effect.succeedNow
)
