/**
 * Returns a version of this logger that only logs messages when the log level
 * satisfies the specified predicate.
 *
 * @tsplus static effect/core/io/Logger.Aspects filterLogLevel
 * @tsplus pipeable effect/core/io/Logger filterLogLevel
 */
export function filterLogLevel(f: (logLevel: LogLevel) => boolean) {
  return <Message, Output>(self: Logger<Message, Output>): Logger<Message, Maybe<Output>> => ({
    apply: (fiberId, logLevel, message, cause, context, spans, annotations) => {
      return f(logLevel)
        ? Maybe.some(
          self.apply(
            fiberId,
            logLevel,
            message,
            cause,
            context,
            spans,
            annotations
          )
        )
        : Maybe.none
    }
  })
}
