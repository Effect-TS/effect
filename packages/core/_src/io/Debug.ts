/**
 * @category debug
 * @since 1.0.0
 */
export const runtimeDebug: {
  logLevelOverride: LogLevel | undefined
  traceExtractor: ((at: number) => string | undefined) | undefined
  traceFilter: (trace: string) => boolean
  traceExecutionEnabled: boolean
  traceExecutionEnabledInCause: boolean
  traceStackEnabledInCause: boolean
  traceSpanEnabledInCause: boolean
  traceExecutionLimit: number
  traceStackLimit: number
  traceSpanLimit: number
  traceExecutionLogEnabled: boolean
  traceAlwaysViaExtractor: boolean
  traceEnabled: boolean
  traceExecutionHook: ((trace: string) => void)[]
  defaultSpanTracer: "identity" | "cause"
} = {
  logLevelOverride: undefined,
  traceExecutionEnabled: false,
  traceExecutionLogEnabled: false,
  traceExecutionEnabledInCause: false,
  traceSpanEnabledInCause: false,
  traceStackEnabledInCause: false,
  traceExecutionLimit: 5,
  traceStackLimit: 5,
  traceSpanLimit: 5,
  traceExtractor: undefined,
  traceFilter: () => true,
  traceEnabled: false,
  traceAlwaysViaExtractor: false,
  traceExecutionHook: [],
  defaultSpanTracer: "identity"
}

/**
 * @category debug
 * @since 1.0.0
 */
export const nodeSourceMapExtractor = (at: number) => {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = at
  const stack = new Error().stack
  Error.stackTraceLimit = limit
  if (stack) {
    const lines = stack.split("\n")
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.startsWith("Error")) {
        const m = lines[i + at]?.match(/(file:\/\/)?\/(.*):(\d+):(\d+)/)
        if (m) {
          return `/${m[2]}:${m[3]}:${m[4]}`
        }
      }
    }
  }
}
