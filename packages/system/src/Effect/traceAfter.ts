// tracing: off

import { succeed } from "./core"
import type { Effect } from "./effect"
import { tap_ } from "./tap"

/**
 * Mention the trace after the execution of self
 */
export function traceAfter_<R, E, A>(self: Effect<R, E, A>, __trace?: string) {
  return tap_(self, () => succeed(undefined, __trace))
}

/**
 * Mention the trace after the execution of self
 *
 * @dataFirst traceAfter_
 */
export function traceAfter(__trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) =>
    tap_(self, () => succeed(undefined, __trace))
}
