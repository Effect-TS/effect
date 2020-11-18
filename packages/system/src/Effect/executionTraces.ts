import type { ExecutionTrace } from "../Tracing"
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
  return new ITracingStatus(self, true)
}
/**
 * Disables Effect tracing facilities for the duration of the effect.
 */

export function untraced<R, E, A>(self: Effect<R, E, A>) {
  return new ITracingStatus(self, false)
}
