/**
 * Keys of the services every fiber caches in its `Fiber.Cache`.
 *
 * Adding one of these keys to a context starts a new cache (see
 * `Context.addUnsafe`). The services and references behind them take their
 * keys from here, so the list cannot drift from the keys the runtime reads,
 * and the runtime can read them without loading the services.
 */

/** @internal */
export const SchedulerKey = "effect/Scheduler"

/** @internal */
export const MaxOpsBeforeYieldKey = "effect/Scheduler/MaxOpsBeforeYield"

/** @internal */
export const PreventSchedulerYieldKey = "effect/Scheduler/PreventSchedulerYield"

/** @internal */
export const TracerKey = "effect/Tracer"

/** @internal */
export const ParentSpanKey = "effect/Tracer/ParentSpan"

/** @internal */
export const TracerEnabledKey = "effect/References/TracerEnabled"

/** @internal */
export const CurrentStackFrameKey = "effect/References/CurrentStackFrame"

/** @internal */
export const CurrentLogLevelKey = "effect/References/CurrentLogLevel"

/** @internal */
export const MinimumLogLevelKey = "effect/References/MinimumLogLevel"

/** @internal */
export const FiberRuntimeMetricsKey = "effect/Metric/FiberRuntimeMetrics"

/** @internal */
export const fiberCachedKeys: ReadonlySet<string> = new Set([
  SchedulerKey,
  MaxOpsBeforeYieldKey,
  PreventSchedulerYieldKey,
  TracerKey,
  ParentSpanKey,
  TracerEnabledKey,
  CurrentStackFrameKey,
  CurrentLogLevelKey,
  MinimumLogLevelKey,
  FiberRuntimeMetricsKey
])
