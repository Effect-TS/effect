// ets_tracing: off

import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { use_ } from "./use"

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 */
export function useNow<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return use_(self, T.succeedNow, __trace)
}
