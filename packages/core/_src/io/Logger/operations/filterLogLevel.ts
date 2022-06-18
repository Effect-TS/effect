/**
 * Returns a version of this logger that only logs messages when the log level
 * satisfies the specified predicate.
 *
 * @tsplus fluent ets/Logger filterLogLevel
 */
export function filterLogLevel_<Message, Output>(
  self: Logger<Message, Output>,
  f: (logLevel: LogLevel) => boolean
): Logger<Message, Maybe<Output>> {
  return {
    apply: (trace, fiberId, logLevel, message, cause, context, spans, annotations) => {
      return f(logLevel)
        ? Maybe.some(
          self.apply(
            trace,
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
  }
}

/**
 * Returns a version of this logger that only logs messages when the log level
 * satisfies the specified predicate.
 *
 * @tsplus static ets/Logger/Aspects filterLogLevel
 */
export const filterLogLevel = Pipeable(filterLogLevel_)
