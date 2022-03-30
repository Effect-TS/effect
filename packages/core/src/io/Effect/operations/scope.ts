import type { Scope } from "../../Scope"
import { HasScope } from "../../Scope"
import { Effect } from "../definition"

/**
 * Returns the current scope.
 *
 * @tsplus static ets/EffectOps scope
 */
export const scope: Effect<HasScope, never, Scope> = Effect.service(HasScope)
