import type { FiberScope } from "../../FiberScope"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns the current fiber's scope.
 *
 * @tsplus static ets/EffectOps scope
 */
export const scope: UIO<FiberScope> = Effect.descriptorWith((descriptor) =>
  Effect.succeedNow(descriptor.scope)
)
