/**
 * The context entries every fiber copies into its `Fiber.Cache`.
 *
 * Each entry owns the key a cache field is read from and the default value
 * fibers use when the context has none. The fiber runtime reads the entries
 * directly, so minimal bundles do not construct the public references;
 * `fiberReference` in `internal/references.ts` builds each public reference
 * from its entry. `Context.add` starts a new fiber cache whenever one of
 * `fiberCachedKeys` changes.
 */
import type { ReferenceDefinition } from "../Context.ts"
import type * as Fiber from "../Fiber.ts"
import { constFalse, constTrue } from "../Function.ts"
import type { LogLevel, Severity } from "../LogLevel.ts"
import type { FiberRuntimeMetricsService } from "../Metric.ts"
import type { StackFrame } from "../References.ts"
import type { Scheduler } from "../Scheduler.ts"
import type { AnySpan, Tracer } from "../Tracer.ts"
import { MixedScheduler } from "./scheduler.ts"

// Exported for the public modules that expose these keys. Reading them from
// `fiberCache` would be a property read, which bundlers keep as a possible
// side effect.

/** @internal */
export const TracerKey = "effect/Tracer"

/** @internal */
export const ParentSpanKey = "effect/Tracer/ParentSpan"

/** @internal */
export const FiberRuntimeMetricsKey = "effect/Metric/FiberRuntimeMetrics"

/**
 * The entry for each `Fiber.Cache` field except `tracerContext`, which is
 * derived from `tracer`. A new field does not compile until it has an entry
 * here, which also adds its key to `fiberCachedKeys`.
 *
 * @internal
 */
export const fiberCache = {
  scheduler: { key: "effect/Scheduler", defaultValue: (): Scheduler => new MixedScheduler() },
  maxOpsBeforeYield: { key: "effect/Scheduler/MaxOpsBeforeYield", defaultValue: () => 2048 },
  preventYield: { key: "effect/Scheduler/PreventSchedulerYield", defaultValue: constFalse },
  // Tracer.Tracer defaults to the native tracer, but fibers read `undefined`
  // when no tracer is provided, so only code that creates spans bundles it
  tracer: { key: TracerKey, defaultValue: (): Tracer | undefined => undefined },
  // Tracer.ParentSpan is a service without a default
  span: { key: ParentSpanKey, defaultValue: (): AnySpan | undefined => undefined },
  tracerEnabled: { key: "effect/References/TracerEnabled", defaultValue: constTrue },
  stackFrame: { key: "effect/References/CurrentStackFrame", defaultValue: (): StackFrame | undefined => undefined },
  logLevel: { key: "effect/References/CurrentLogLevel", defaultValue: (): Severity => "Info" },
  minimumLogLevel: { key: "effect/References/MinimumLogLevel", defaultValue: (): LogLevel => "Info" },
  runtimeMetrics: {
    key: FiberRuntimeMetricsKey,
    defaultValue: (): FiberRuntimeMetricsService | undefined => undefined
  }
} as const satisfies {
  readonly [Field in Exclude<keyof Fiber.Fiber.Cache, "tracerContext">]: ReferenceDefinition<Fiber.Fiber.Cache[Field]>
}

/**
 * The keys whose change makes `Context.add` start a new fiber cache.
 *
 * @internal
 */
export const fiberCachedKeys: ReadonlySet<string> = new Set(Object.values(fiberCache).map((entry) => entry.key))
