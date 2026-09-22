import type * as Tracer from "../Tracer.ts"
import { getStackTraceLimit, setStackTraceLimit } from "./stackTraceLimit.ts"

/** @internal */
export interface ErrorWithStackTraceLimit {
  stackTraceLimit?: number | undefined
}

/** @internal */
export const addSpanStackTrace = <A extends Tracer.TraceOptions>(
  options: A | undefined
): A => {
  if (options?.captureStackTrace === false) {
    return options
  } else if (options?.captureStackTrace !== undefined && typeof options.captureStackTrace !== "boolean") {
    return options
  }
  const limit = getStackTraceLimit()
  if (limit === 0 && options?.captureStackTrace !== true) {
    return { ...options, captureStackTrace: false } as A
  }
  setStackTraceLimit(3)
  const traceError = new Error()
  setStackTraceLimit(limit)
  return {
    ...options,
    captureStackTrace: spanCleaner(traceError)
  } as A
}

/** @internal */
export const makeStackCleaner = (line: number) => (error: Error): () => string | undefined => {
  let cache: string | undefined
  return () => {
    if (cache !== undefined) return cache
    const trace = error.stack
    if (!trace) return undefined
    const lines = trace.split("\n")
    if (lines[line] !== undefined) {
      cache = lines[line].trim()
      return cache
    }
  }
}

const spanCleaner = makeStackCleaner(3)
