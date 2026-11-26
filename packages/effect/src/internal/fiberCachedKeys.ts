import type { LogLevel, Severity } from "../LogLevel.ts"

/**
 * Runtime keys and defaults cached on every fiber's `Fiber.Cache`.
 *
 * `Context.ts` reads `fiberCachedKeys` for cache invalidation, and the services
 * that expose these keys import them from here so the runtime can read them
 * without constructing the service objects in minimal bundles.
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
export const defaultValueCacheKey = "~effect/Context/defaultValue" as const

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
 * Keys whose values fibers cache. Adding one of them to a context starts a new
 * cache. `Context.Service` and `Context.Reference` add their key here when
 * created with `fiberCached: true`.
 *
 * @internal
 */
export const fiberCachedKeys: Set<string> = new Set([
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

/**
 * Binds a freshly created `Context.Reference` to a shared lazy default getter
 * via a non-enumerable getter on `defaultValueCacheKey`, so both
 * `Context.get(Context.empty(), ref)` and the fiber runtime resolve the same
 * memoized instance while `ref.defaultValue()` still creates a fresh instance.
 *
 * @internal
 */
export const bindMemoizedDefault = <Ref extends object, A>(
  ref: Ref,
  getDefault: () => A
): Ref =>
  Object.defineProperty(ref, defaultValueCacheKey, {
    get: getDefault
  })
