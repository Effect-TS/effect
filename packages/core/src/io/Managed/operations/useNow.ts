import { Effect } from "../../Effect"
import type { Managed } from "../definition"

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 *
 * @tsplus fluent ets/Managed useNow
 */
export function useNow<R, E, A>(self: Managed<R, E, A>, __etsTrace?: string) {
  return self.use(Effect.succeedNow)
}
