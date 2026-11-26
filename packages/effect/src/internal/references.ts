import * as Context from "../Context.ts"
import type { ErrorReporter } from "../ErrorReporter.ts"
import { constTrue, constUndefined } from "../Function.ts"
import type { LogLevel, Severity } from "../LogLevel.ts"
import type { ReadonlyRecord } from "../Record.ts"
import type { StackFrame } from "../References.ts"
import type { SpanLink } from "../Tracer.ts"
import { CurrentLogLevelKey, CurrentStackFrameKey, MinimumLogLevelKey, TracerEnabledKey } from "./fiberCachedKeys.ts"

/** @internal */
export const CurrentErrorReporters = Context.Reference<ReadonlySet<ErrorReporter>>(
  "effect/ErrorReporter/CurrentErrorReporters",
  { defaultValue: () => new Set() }
)

/** @internal */
export const currentStackFrameDefinition: Context.ReferenceDefinition<StackFrame | undefined> = {
  key: CurrentStackFrameKey,
  defaultValue: constUndefined
}

/** @internal */
export const CurrentStackFrame: Context.Reference<StackFrame | undefined> = Context.referenceFromDefinition(
  currentStackFrameDefinition
)

/** @internal */
export const tracerEnabledDefinition: Context.ReferenceDefinition<boolean> = {
  key: TracerEnabledKey,
  defaultValue: constTrue
}

/** @internal */
export const TracerEnabled: Context.Reference<boolean> = Context.referenceFromDefinition(tracerEnabledDefinition)

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
export const currentLogLevelDefinition: Context.ReferenceDefinition<Severity> = {
  key: CurrentLogLevelKey,
  defaultValue: () => "Info"
}

/** @internal */
export const CurrentLogLevel: Context.Reference<Severity> = Context.referenceFromDefinition(currentLogLevelDefinition)

/** @internal */
export const minimumLogLevelDefinition: Context.ReferenceDefinition<LogLevel> = {
  key: MinimumLogLevelKey,
  defaultValue: () => "Info"
}

/** @internal */
export const MinimumLogLevel: Context.Reference<LogLevel> = Context.referenceFromDefinition(minimumLogLevelDefinition)

/** @internal */
export const UnhandledLogLevel: Context.Reference<Severity | undefined> = Context.Reference(
  "effect/References/UnhandledLogLevel",
  { defaultValue: (): Severity | undefined => "Error" }
)

/** @internal */
export const CurrentLogSpans = Context.Reference<
  ReadonlyArray<[label: string, timestamp: number]>
>("effect/References/CurrentLogSpans", { defaultValue: () => [] })
