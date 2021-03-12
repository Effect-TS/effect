// tracing: off

import { halt, succeed } from "./core"
import type { Effect } from "./effect"
import { IFold } from "./primitives"

/**
 * Mention the trace after the execution of self
 */
export function traceAfter_<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return new IFold(self, halt, succeed, __trace)
}

/**
 * Mention the trace after the execution of self
 *
 * @dataFirst traceAfter_
 */
export function traceAfter(__trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => new IFold(self, halt, succeed, __trace)
}
