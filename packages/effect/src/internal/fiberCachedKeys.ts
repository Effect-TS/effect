/**
 * The services every fiber caches (see `Fiber.Cache`).
 *
 * The services that use these keys import them from here, and `Context.ts`
 * builds its cache invalidation set from `fiberCachedKeys`. The runtime reads
 * these services by key or by definition, so the set cannot depend on the
 * services themselves being in a bundle.
 */
import type { ReferenceDefinition } from "../Context.ts"
import type { LogLevel, Severity } from "../LogLevel.ts"
import type { StackFrame } from "../References.ts"

/** @internal */
export const SchedulerKey = "effect/Scheduler"
/** @internal */
export const TracerKey = "effect/Tracer"
/** @internal */
export const ParentSpanKey = "effect/Tracer/ParentSpan"
/** @internal */
export const FiberRuntimeMetricsKey = "effect/Metric/FiberRuntimeMetrics"

// The defaults below need nothing beyond a literal, so the definitions live
// here. The scheduler's default lives with `MixedScheduler` in `Scheduler.ts`.

/** @internal */
export const maxOpsBeforeYield: ReferenceDefinition<number> = {
  key: "effect/Scheduler/MaxOpsBeforeYield",
  defaultValue: () => 2048
}
/** @internal */
export const preventSchedulerYield: ReferenceDefinition<boolean> = {
  key: "effect/Scheduler/PreventSchedulerYield",
  defaultValue: () => false
}
/** @internal */
export const tracerEnabled: ReferenceDefinition<boolean> = {
  key: "effect/References/TracerEnabled",
  defaultValue: () => true
}
/** @internal */
export const currentStackFrame: ReferenceDefinition<StackFrame | undefined> = {
  key: "effect/References/CurrentStackFrame",
  defaultValue: () => undefined
}
/** @internal */
export const currentLogLevel: ReferenceDefinition<Severity> = {
  key: "effect/References/CurrentLogLevel",
  defaultValue: () => "Info"
}
/** @internal */
export const minimumLogLevel: ReferenceDefinition<LogLevel> = {
  key: "effect/References/MinimumLogLevel",
  defaultValue: () => "Info"
}

/** @internal */
export const fiberCachedKeys: ReadonlyArray<string> = [
  SchedulerKey,
  TracerKey,
  ParentSpanKey,
  FiberRuntimeMetricsKey,
  maxOpsBeforeYield.key,
  preventSchedulerYield.key,
  tracerEnabled.key,
  currentStackFrame.key,
  currentLogLevel.key,
  minimumLogLevel.key
]
