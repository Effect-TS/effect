import type { LogLevel, Severity } from "../LogLevel.ts"
import type * as Tracer from "../Tracer.ts"

/**
 * Reading cached services by key lets bundlers drop unused service constructors.
 */

/** @internal */
export const SchedulerKey = "effect/Scheduler" as const

/** @internal */
export const MaxOpsBeforeYieldKey = "effect/Scheduler/MaxOpsBeforeYield" as const

/** @internal */
export const PreventSchedulerYieldKey = "effect/Scheduler/PreventSchedulerYield" as const

/** @internal */
export const TracerKey = "effect/Tracer" satisfies typeof Tracer.TracerKey

/** @internal */
export const ParentSpanKey = "effect/Tracer/ParentSpan" satisfies typeof Tracer.ParentSpanKey

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
 * Constrains fiber cache reads to registered keys. `tracerContext` is derived
 * from `tracer`, not read from the context.
 *
 * @internal
 */
const runtimeKeys = [
  SchedulerKey,
  TracerKey,
  TracerEnabledKey,
  ParentSpanKey,
  CurrentLogLevelKey,
  MinimumLogLevelKey,
  CurrentStackFrameKey,
  FiberRuntimeMetricsKey,
  MaxOpsBeforeYieldKey,
  PreventSchedulerYieldKey
] as const

/** @internal */
export type FiberCacheKey = typeof runtimeKeys[number]

/**
 * Pre-register runtime keys so cache invalidation survives tree-shaking of
 * their service constructors. `fiberCached: true` registers additional keys.
 *
 * @internal
 */
export const fiberCachedKeys: Set<string> = new Set(runtimeKeys)
