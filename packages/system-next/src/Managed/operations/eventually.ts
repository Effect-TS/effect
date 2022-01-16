// ets_tracing: off

import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as T from "./_internal/effect"

/**
 * Returns a `Managed` that ignores errors raised by the acquire effect and
 * runs it repeatedly until it eventually succeeds.
 */
export function eventually<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, A> {
  return managedApply(T.eventually(self.effect, __trace))
}
