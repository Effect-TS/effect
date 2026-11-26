/**
 * Runtime keys cached on every fiber's `Fiber.Cache`.
 *
 * `Context.ts` builds its cache-invalidation set from `fiberCachedKeys`, and
 * the services that expose these keys import them from here so the runtime can
 * read them without constructing the service objects in minimal bundles.
 */

/** @internal */
export const SchedulerKey = "effect/Scheduler" as const

/** @internal */
export const MaxOpsBeforeYieldKey = "effect/Scheduler/MaxOpsBeforeYield" as const

/** @internal */
export const PreventSchedulerYieldKey = "effect/Scheduler/PreventSchedulerYield" as const

/** @internal */
export const TracerKey = "effect/Tracer" as const

/** @internal */
export const ParentSpanKey = "effect/Tracer/ParentSpan" as const

/** @internal */
export const TracerEnabledKey = "effect/References/TracerEnabled" as const

/** @internal */
export const CurrentStackFrameKey = "effect/References/CurrentStackFrame" as const

/** @internal */
export const CurrentLogLevelKey = "effect/References/CurrentLogLevel" as const

/** @internal */
export const MinimumLogLevelKey = "effect/References/MinimumLogLevel" as const

/** @internal */
export const FiberRuntimeMetricsKey = "effect/Metric/FiberRuntimeMetrics" as const

/** @internal */
export const currentFiberTypeId = "~effect/Fiber/currentFiber" as const

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
