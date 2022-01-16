// ets_tracing: off

import type { Managed } from "../definition"
import { map_ } from "./map"

export function asUnit<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, E, void> {
  return map_(self, () => undefined)
}
