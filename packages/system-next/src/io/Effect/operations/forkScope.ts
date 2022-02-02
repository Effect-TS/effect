import type { Scope } from "../../Scope"
import type { UIO } from "../definition"
import { Effect, IGetForkScope } from "../definition"

/**
 * Retrieves the scope that will be used to supervise forked effects.
 *
 * @tsplus static ets/EffectOps forkScope
 */
export const forkScope: UIO<Scope> = new IGetForkScope((scope) => Effect.succeed(scope))
