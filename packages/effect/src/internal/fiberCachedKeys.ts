/**
 * Keys of the services every fiber caches (see `Fiber.Cache`).
 *
 * The services that use these keys import them from here, and `Context.ts`
 * builds its cache invalidation set from `fiberCachedKeys`. The runtime reads
 * these services by key, so a bundle can contain a key without the service
 * that defines it, which is why they are not registered through the
 * `fiberCached` option.
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
export const fiberCachedKeys: ReadonlyArray<string> = [
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
]
