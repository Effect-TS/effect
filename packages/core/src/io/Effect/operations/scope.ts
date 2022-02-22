import type { Scope } from "../../Scope"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns the current fiber's scope.
 *
 * @tsplus static ets/EffectOps scope
 */
export const scope: UIO<Scope> = Effect.descriptorWith((descriptor) =>
  Effect.succeedNow(descriptor.scope)
)
