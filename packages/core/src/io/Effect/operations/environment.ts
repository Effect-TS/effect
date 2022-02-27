import { effectEnvironment } from "../../FiberRef/definition/data"
import type { RIO } from "../definition"

/**
 * Accesses the whole environment of the effect.
 *
 * @tsplus static ets/EffectOps environment
 */
export const environment: <R>(__tsplusTrace?: string | undefined) => RIO<R, R> =
  effectEnvironment
