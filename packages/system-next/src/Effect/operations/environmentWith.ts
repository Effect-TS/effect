import type { RIO } from "../definition"
import { environment } from "./environment"
import { map_ } from "./map"

/**
 * Accesses the environment of the effect.
 */
export function environmentWith<R, R1, E, A>(
  f: (env: R) => A,
  __trace?: string
): RIO<R, A> {
  return map_(environment<R>(), f, __trace)
}
