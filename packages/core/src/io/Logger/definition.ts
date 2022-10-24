import type { List } from "@fp-ts/data/List"

/**
 * @tsplus type effect/core/io/Logger
 * @category model
 * @since 1.0.0
 */
export interface Logger<Message, Output> {
  readonly apply: (
    fiberId: FiberId,
    logLevel: LogLevel,
    message: Message,
    cause: Cause<unknown>,
    context: FiberRefs,
    spans: List<LogSpan>,
    annotations: ReadonlyMap<string, string>
  ) => Output
}

/**
 * @tsplus type effect/core/io/Logger.Ops
 * @category model
 * @since 1.0.0
 */
export interface LoggerOps {
  $: LoggerAspects
}
export const Logger: LoggerOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Logger.Aspects
 * @category model
 * @since 1.0.0
 */
export interface LoggerAspects {}
