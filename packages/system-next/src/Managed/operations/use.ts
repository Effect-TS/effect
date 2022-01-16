// ets_tracing: off

import type { Managed } from "../definition"
import type { Effect } from "./_internal/effect"
import { managedUse_ as use_ } from "./_internal/effect-api"

export {
  /**
   * Run an effect while acquiring the resource before and releasing it after.
   *
   */
  use_
}

/**
 * Run an effect while acquiring the resource before and releasing it after.
 *
 * @ets_data_first use_
 */
export function use<A, R2, E2, B>(f: (a: A) => Effect<R2, E2, B>, __trace?: string) {
  return <R, E>(self: Managed<R, E, A>): Effect<R & R2, E | E2, B> =>
    use_(self, f, __trace)
}
