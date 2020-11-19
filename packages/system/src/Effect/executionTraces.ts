import { flow } from "../Function"
import type { Option } from "../Option"
import { none, some } from "../Option"
import type { ExecutionTrace } from "../Tracing"
import { globalTracesQuantity, traceF, traceFrom, traceWith } from "../Tracing"
import { ICheckTracingStatus } from "."
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

/**
 * Checks the tracing status, and produces the effect returned by the
 * specified callback.
 */
export function checkTracingStatus<R, E, A>(
  f: (_: Option<number>) => Effect<R, E, A>
): Effect<R, E, A> {
  const trace = traceF(() => flow(traceWith("Effect/checkTracingStatus"), traceFrom(f)))
  const g = trace(f)
  return new ICheckTracingStatus(g)
}

/**
 * Makes the effect as untraced, but passes it a restore function that
 * can be used to restore the inherited tracability from whatever region
 * the effect is composed into.
 */
export function untracedMask<R, E, A>(
  f: (restore: TracingStatusRestore) => Effect<R, E, A>
) {
  const trace = traceF(() => flow(traceWith("Effect/untracedMask"), traceFrom(f)))
  return checkTracingStatus(
    trace((flag) => untraced(f(new TracingStatusRestoreImpl(flag))))
  )
}

/**
 * Makes the effect as traced, but passes it a restore function that
 * can be used to restore the inherited tracability from whatever region
 * the effect is composed into.
 */
export function tracedMask<R, E, A>(
  f: (restore: TracingStatusRestore) => Effect<R, E, A>
) {
  const trace = traceF(() => flow(traceWith("Effect/tracedMask"), traceFrom(f)))
  return checkTracingStatus(
    trace((flag) => traced(f(new TracingStatusRestoreImpl(flag))))
  )
}

/**
 * Used to restore the inherited tracability
 */
export interface TracingStatusRestore {
  readonly restore: <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
}

export class TracingStatusRestoreImpl implements TracingStatusRestore {
  constructor(readonly flag: Option<number>) {
    this.restore = this.restore.bind(this)
  }

  restore<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
    return new ITracingStatus(effect, this.flag)
  }
}
