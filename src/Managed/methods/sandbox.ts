import * as T from "../deps"
import { Managed } from "../managed"

/**
 * Exposes the full cause of failure of this effect.
 */
export function sandbox<R, E, A>(self: Managed<R, E, A>) {
  return new Managed(T.sandbox(self.effect))
}
