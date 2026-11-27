import type { LogLevel, Severity } from "../LogLevel.ts"
import type * as Tracer from "../Tracer.ts"

/**
 * The context keys and defaults behind a fiber's `Fiber.Cache`.
 *
 * The fiber reads its cache by key, so bundles that never use one of these
 * services do not construct it. The services take their key and default from
 * here, except `Tracer`, whose public key constants these are checked against.
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
 * The key of every `Fiber.Cache` field the fiber reads from its context
 * (`tracerContext` is derived from `tracer`). The fiber reads its cache only
 * through `FiberCacheKey`, so a key missing here fails typechecking there.
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
 * Keys whose values fibers cache, so adding one to a context starts a new
 * cache.
 *
 * Seeded with every `FiberCacheKey`, so a key invalidates the cache even
 * in bundles where the service declaring it was tree-shaken. Services declared
 * with `fiberCached: true` add their own key.
 *
 * @internal
 */
export const fiberCachedKeys: Set<string> = new Set(runtimeKeys)
