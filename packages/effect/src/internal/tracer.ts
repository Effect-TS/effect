/**
 * @since 2.0.0
 */
import * as Context from "../Context.js"
import type * as Exit from "../Exit.js"
import { constFalse } from "../Function.js"
import type * as Option from "../Option.js"
import type * as Tracer from "../Tracer.js"

/** @internal */
export const TracerTypeId: Tracer.TracerTypeId = Symbol.for("effect/Tracer") as Tracer.TracerTypeId

/** @internal */
export const make = (options: Omit<Tracer.Tracer, Tracer.TracerTypeId>): Tracer.Tracer => ({
  [TracerTypeId]: TracerTypeId,
  ...options
})

/** @internal */
export const tracerTag = Context.GenericTag<Tracer.Tracer>("effect/Tracer")

/** @internal */
export const spanTag = Context.GenericTag<Tracer.ParentSpan, Tracer.AnySpan>("effect/ParentSpan")

const randomHexString = (function() {
  const characters = "abcdef0123456789"
  const charactersLength = characters.length
  return function(length: number) {
    let result = ""
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
  }
})()

/** @internal */
export class NativeSpan implements Tracer.Span {
  readonly _tag = "Span"
  readonly spanId: string
  readonly traceId: string = "native"
  readonly sampled = true

  status: Tracer.SpanStatus
  attributes: Map<string, unknown>
  events: Array<[name: string, startTime: bigint, attributes: Record<string, unknown>]> = []
  links: Array<Tracer.SpanLink>

  constructor(
    readonly name: string,
    readonly parent: Option.Option<Tracer.AnySpan>,
    readonly context: Context.Context<never>,
    links: Iterable<Tracer.SpanLink>,
    readonly startTime: bigint,
    readonly kind: Tracer.SpanKind
  ) {
    this.status = {
      _tag: "Started",
      startTime
    }
    this.attributes = new Map()
    this.traceId = parent._tag === "Some" ? parent.value.traceId : randomHexString(32)
    this.spanId = randomHexString(16)
    this.links = Array.from(links)
  }

  end(endTime: bigint, exit: Exit.Exit<unknown, unknown>): void {
    this.status = {
      _tag: "Ended",
      endTime,
      exit,
      startTime: this.status.startTime
    }
  }

  attribute(key: string, value: unknown): void {
    this.attributes.set(key, value)
  }

  event(name: string, startTime: bigint, attributes?: Record<string, unknown>): void {
    this.events.push([name, startTime, attributes ?? {}])
  }

  addLinks(links: ReadonlyArray<Tracer.SpanLink>): void {
    // eslint-disable-next-line no-restricted-syntax
    this.links.push(...links)
  }
}

/** @internal */
export const nativeTracer: Tracer.Tracer = make({
  span: (name, parent, context, links, startTime, kind) =>
    new NativeSpan(
      name,
      parent,
      context,
      links,
      startTime,
      kind
    ),
  context: (f) => f()
})

/** @internal */
export const externalSpan = (options: {
  readonly spanId: string
  readonly traceId: string
  readonly sampled?: boolean | undefined
  readonly context?: Context.Context<never> | undefined
}): Tracer.ExternalSpan => ({
  _tag: "ExternalSpan",
  spanId: options.spanId,
  traceId: options.traceId,
  sampled: options.sampled ?? true,
  context: options.context ?? Context.empty()
})

/** @internal */
export const addSpanStackTrace = (options: Tracer.SpanOptions | undefined): Tracer.SpanOptions => {
  if (options?.captureStackTrace === false) {
    return options
  } else if (options?.captureStackTrace !== undefined && typeof options.captureStackTrace !== "boolean") {
    return options
  }
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = 3
  const traceError = new Error()
  Error.stackTraceLimit = limit
  let cache: false | string = false
  return {
    ...options,
    captureStackTrace: () => {
      if (cache !== false) {
        return cache
      }
      if (traceError.stack !== undefined) {
        const stack = traceError.stack.split("\n")
        if (stack[3] !== undefined) {
          cache = stack[3].trim()
          return cache
        }
      }
    }
  }
}

/** @internal */
export const DisablePropagation = Context.Reference<Tracer.DisablePropagation>()("effect/Tracer/DisablePropagation", {
  defaultValue: constFalse
})

// -----------------------------------------------------------------------------
// Source Location Capture
// -----------------------------------------------------------------------------

/**
 * Represents a source code location captured from a stack trace.
 * @internal
 */
export interface SourceLocation {
  readonly file: string
  readonly line: number
  readonly column: number
  readonly functionName?: string
}

// Cache for source locations: raw frame string -> SourceLocation
// Maximum cache size to prevent unbounded memory growth in long-running services
const MAX_SOURCE_LOCATION_CACHE_SIZE = 1000
const sourceLocationCache = new Map<string, SourceLocation>()

/**
 * Evicts the oldest cache entry if at capacity (FIFO eviction).
 * Maps maintain insertion order, so the first key is the oldest.
 * @internal
 */
const evictOldestCacheEntry = (): void => {
  if (sourceLocationCache.size >= MAX_SOURCE_LOCATION_CACHE_SIZE) {
    const firstKey = sourceLocationCache.keys().next().value
    if (firstKey !== undefined) {
      sourceLocationCache.delete(firstKey)
    }
  }
}

/**
 * Parses source location from a pre-captured stack trace string with caching.
 * This is used when the stack was captured earlier (while user code was on stack)
 * but parsing is delayed until we know capture is enabled.
 *
 * @internal
 */
export const parseSourceLocationFromStack = (stack: string): SourceLocation | undefined => {
  const lines = stack.split("\n")
  // Find first non-internal frame (skip Error, fork, unsafeMakeChildFiber, etc.)
  const userFrame = findUserFrame(lines)
  if (!userFrame) return undefined

  const cacheKey = userFrame.raw // Use raw frame string as key

  const cached = sourceLocationCache.get(cacheKey)
  if (cached) return cached

  const parsed = parseStackFrame(userFrame.raw)
  if (parsed) {
    evictOldestCacheEntry() // Ensure cache doesn't grow unbounded
    sourceLocationCache.set(cacheKey, parsed)
  }
  return parsed
}

/**
 * Captures the source location from the current stack trace with caching.
 * Uses the raw stack frame string as the cache key for fast lookups.
 *
 * Note: Uses the current Error.stackTraceLimit value (typically 10-15).
 * If capturing deeply nested call sites, configure Error.stackTraceLimit
 * globally before importing Effect (e.g., Error.stackTraceLimit = 25).
 *
 * @internal
 */
export const captureSourceLocationCached = (): SourceLocation | undefined => {
  const traceError = new Error()
  if (!traceError.stack) return undefined
  return parseSourceLocationFromStack(traceError.stack)
}

const findUserFrame = (stack: Array<string>): { raw: string; index: number } | undefined => {
  // Skip frames from Effect internals
  for (let i = 1; i < stack.length; i++) {
    const frame = stack[i]
    if (
      frame &&
      !isInternalFrame(frame)
    ) {
      return { raw: frame.trim(), index: i }
    }
  }
  return undefined
}

const isInternalFrame = (frame: string): boolean => {
  // Skip internal directories
  if (frame.includes("/internal/")) return true
  // Skip Effect core source files
  if (frame.includes("/packages/effect/src/")) return true
  if (frame.includes("/effect/dist/")) return true
  // Skip node_modules (for published effect packages)
  if (frame.includes("node_modules/effect/")) return true
  if (frame.includes("node_modules/@effect/")) return true
  // Skip specific internal functions
  if (frame.includes("fiberRuntime")) return true
  if (frame.includes("captureSourceLocation")) return true
  if (frame.includes("effect_internal_function")) return true
  return false
}

const parseStackFrame = (frame: string): SourceLocation | undefined => {
  // Parse "at functionName (file:line:col)" or "at file:line:col"
  const match = frame.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/)
  if (!match) return undefined

  return {
    functionName: match[1],
    file: match[2],
    line: parseInt(match[3], 10),
    column: parseInt(match[4], 10)
  }
}
