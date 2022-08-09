/**
 * @tsplus type effect/core/io/Logger
 */
export interface Logger<Message, Output> {
  readonly apply: (
    fiberId: FiberId,
    logLevel: LogLevel,
    message: Message,
    cause: Cause<unknown>,
    context: ImmutableMap<FiberRef<unknown>, unknown>,
    spans: List<LogSpan>,
    annotations: ImmutableMap<string, string>
  ) => Output
}

/**
 * @tsplus type effect/core/io/Logger.Ops
 */
export interface LoggerOps {
  $: LoggerAspects
}
export const Logger: LoggerOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Logger.Aspects
 */
export interface LoggerAspects {}
