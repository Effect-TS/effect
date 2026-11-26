import * as Context from "../Context.ts"
import type { ErrorReporter } from "../ErrorReporter.ts"
import { constTrue } from "../Function.ts"
import type { LogLevel, Severity } from "../LogLevel.ts"
import type { ReadonlyRecord } from "../Record.ts"
import type { StackFrame } from "../References.ts"
import type { SpanLink } from "../Tracer.ts"
import { fiberCache } from "./fiberCache.ts"

/**
 * Creates the public reference for a fiber-cached entry.
 *
 * The reference keeps the entry's factory as its `defaultValue`, so calling it
 * still creates a new value, and shares the entry's memoized default, so
 * `Context.get` and the fiber runtime return the same instance (for example
 * the default `Scheduler`).
 *
 * @internal
 */
export const fiberReference = <A>(entry: Context.ReferenceDefinition<A>): Context.Reference<A> =>
  Object.defineProperty(
    Context.Reference<A>(entry.key, { defaultValue: entry.defaultValue }),
    Context.defaultValueCacheKey,
    { get: () => Context.getDefaultValue(entry) }
  )

/** @internal */
export const CurrentErrorReporters = Context.Reference<ReadonlySet<ErrorReporter>>(
  "effect/ErrorReporter/CurrentErrorReporters",
  { defaultValue: () => new Set() }
)

/** @internal */
export const CurrentStackFrame: Context.Reference<StackFrame | undefined> = fiberReference(fiberCache.stackFrame)

/** @internal */
export const TracerEnabled: Context.Reference<boolean> = fiberReference(fiberCache.tracerEnabled)

/** @internal */
export const TracerTimingEnabled = Context.Reference<boolean>("effect/References/TracerTimingEnabled", {
  defaultValue: constTrue
})

/** @internal */
export const TracerSpanAnnotations = Context.Reference<ReadonlyRecord<string, unknown>>(
  "effect/References/TracerSpanAnnotations",
  { defaultValue: () => ({}) }
)

/** @internal */
export const TracerSpanLinks = Context.Reference<ReadonlyArray<SpanLink>>("effect/References/TracerSpanLinks", {
  defaultValue: () => []
})

/** @internal */
export const CurrentLogAnnotations = Context.Reference<ReadonlyRecord<string, unknown>>(
  "effect/References/CurrentLogAnnotations",
  { defaultValue: () => ({}) }
)

/** @internal */
export const CurrentLogLevel: Context.Reference<Severity> = fiberReference(fiberCache.logLevel)

/** @internal */
export const MinimumLogLevel: Context.Reference<LogLevel> = fiberReference(fiberCache.minimumLogLevel)

/** @internal */
export const UnhandledLogLevel: Context.Reference<Severity | undefined> = Context.Reference(
  "effect/References/UnhandledLogLevel",
  { defaultValue: (): Severity | undefined => "Error" }
)

/** @internal */
export const CurrentLogSpans = Context.Reference<
  ReadonlyArray<[label: string, timestamp: number]>
>("effect/References/CurrentLogSpans", { defaultValue: () => [] })
