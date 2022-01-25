import type { RIO } from "../definition"
import { environment } from "./environment"
import { map_ } from "./map"

/**
 * Accesses the environment of the effect.
 *
 * @ets static ets/EffectOps environmentWith
 */
export function environmentWith<R, A>(
  f: (env: R) => A,
  __etsTrace?: string
): RIO<R, A> {
  return map_(environment<R>(), f, __etsTrace)
}
