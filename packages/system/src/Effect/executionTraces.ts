import { none, some } from "../Option"
import type { ExecutionTrace } from "../Tracing"
import { globalTracesQuantity } from "../Tracing"
import type { Effect, UIO } from "./effect"
import { IGetExecutionTraces, ITracingStatus } from "./primitives"

/**
 * Dumps execution traces
 */

export const executionTraces: UIO<readonly ExecutionTrace[]> = new IGetExecutionTraces()

/**
 * Enables Effect tracing for this effect. Because this is the default, this
 * operation only has an additional meaning if the effect is located within
 * an `untraced` section, or the current fiber has been spawned by a parent
 * inside an `untraced` section.
 *
 * Note this will only work if globalTracingEnabled is also enabled (default)
 */
export function traced<R, E, A>(self: Effect<R, E, A>) {
  return new ITracingStatus(self, some(globalTracesQuantity.get))
}

/**
 * Enables Effect tracing for this effect for up to n traces.
 *
 * Note this will only work if globalTracingEnabled is also enabled (default)
 */
export function tracedN(n: number) {
  return <R, E, A>(self: Effect<R, E, A>) => new ITracingStatus(self, some(n))
}

/**
 * Disables Effect tracing facilities for the duration of the effect.
 */
export function untraced<R, E, A>(self: Effect<R, E, A>) {
  return new ITracingStatus(self, none)
}
