import type { Effect, RIO } from "./effect"
import { fold_ } from "./fold_"

/**
 * Returns a new effect that ignores the success or failure of this effect.
 */
export function ignore<R, E, A>(self: Effect<R, E, A>): RIO<R, void> {
  return fold_(
    self,
    () => {
      //
    },
    () => {
      //
    }
  )
}
