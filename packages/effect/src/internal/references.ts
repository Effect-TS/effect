import * as Context from "../Context.ts"
import type { ErrorReporter } from "../ErrorReporter.ts"
import { constTrue, constUndefined } from "../Function.ts"
import type { LogLevel, Severity } from "../LogLevel.ts"
import type { ReadonlyRecord } from "../Record.ts"
import type { StackFrame } from "../References.ts"
import type { SpanLink } from "../Tracer.ts"

/** @internal */
export const CurrentErrorReporters = Context.Reference<ReadonlySet<ErrorReporter>>(
  "effect/ErrorReporter/CurrentErrorReporters",
  { defaultValue: () => new Set() }
)

const currentStackFrameKey = "effect/References/CurrentStackFrame"

/** @internal */
export const currentStackFrameOptions: Context.ReferenceOptions<StackFrame | undefined> = {
  key: currentStackFrameKey,
  defaultValue: constUndefined
}

/** @internal */
export const CurrentStackFrame = Context.Reference<StackFrame | undefined>(currentStackFrameKey, {
  fiberCached: true,
  defaultValue: constUndefined
})

const tracerEnabledKey = "effect/References/TracerEnabled"

/** @internal */
export const tracerEnabledOptions: Context.ReferenceOptions<boolean> = {
  key: tracerEnabledKey,
  defaultValue: constTrue
}

/** @internal */
export const TracerEnabled = Context.Reference<boolean>(tracerEnabledKey, {
  fiberCached: true,
  defaultValue: constTrue
})

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

const currentLogLevelKey = "effect/References/CurrentLogLevel"

const defaultLogLevel = (): "Info" => "Info"

/** @internal */
export const currentLogLevelOptions: Context.ReferenceOptions<Severity> = {
  key: currentLogLevelKey,
  defaultValue: defaultLogLevel
}

/** @internal */
export const CurrentLogLevel: Context.Reference<Severity> = Context.Reference<Severity>(currentLogLevelKey, {
  fiberCached: true,
  defaultValue: defaultLogLevel
})

const minimumLogLevelKey = "effect/References/MinimumLogLevel"

/** @internal */
export const minimumLogLevelOptions: Context.ReferenceOptions<LogLevel> = {
  key: minimumLogLevelKey,
  defaultValue: defaultLogLevel
}

/** @internal */
export const MinimumLogLevel = Context.Reference<LogLevel>(minimumLogLevelKey, {
  fiberCached: true,
  defaultValue: defaultLogLevel
})

/** @internal */
export const UnhandledLogLevel: Context.Reference<Severity | undefined> = Context.Reference(
  "effect/References/UnhandledLogLevel",
  { defaultValue: (): Severity | undefined => "Error" }
)

/** @internal */
export const CurrentLogSpans = Context.Reference<
  ReadonlyArray<[label: string, timestamp: number]>
>("effect/References/CurrentLogSpans", { defaultValue: () => [] })
