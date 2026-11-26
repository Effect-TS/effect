import type { LogLevel, Severity } from "../LogLevel.ts"

/**
 * Runtime keys and defaults cached on every fiber's `Fiber.Cache`.
 *
 * The services that expose these keys import them from here, so the runtime can
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
export const defaultMaxOpsBeforeYield = 2048

/** @internal */
export const defaultPreventSchedulerYield = false

/** @internal */
export const defaultTracerEnabled = true

/** @internal */
export const defaultCurrentLogLevel: Severity = "Info"

/** @internal */
export const defaultMinimumLogLevel: LogLevel = "Info"

/**
 * The keys whose change makes `Context.add` start a new fiber cache.
 *
 * The runtime's own keys are listed here rather than registered by their
 * services, because fibers read them even when those services are tree-shaken.
 * Services created with `fiberCached: true` add their key.
 *
 * @internal
 */
export const fiberCachedKeys = new Set<string>([
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
