// ets_tracing: off

import type { Effect } from "../definition"
import { ISucceedNow } from "../definition"

/**
 * Returns an effect that models success with the specified value.
 */
export function succeedNow<A>(a: A, __trace?: string): Effect<unknown, never, A> {
  return new ISucceedNow(a, __trace)
}
