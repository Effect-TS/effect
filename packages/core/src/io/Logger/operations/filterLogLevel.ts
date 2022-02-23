import { Option } from "../../../data/Option"
import type { LogLevel } from "../../LogLevel"
import type { Logger } from "../definition"

/**
 * Returns a version of this logger that only logs messages when the log level
 * satisfies the specified predicate.
 *
 * @tsplus fluent ets/Logger filterLogLevel
 */
export function filterLogLevel_<Message, Output>(
  self: Logger<Message, Output>,
  f: (logLevel: LogLevel) => boolean
): Logger<Message, Option<Output>> {
  return {
    apply: (trace, fiberId, logLevel, message, cause, context, spans, annotations) => {
      return f(logLevel)
        ? Option.some(
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
        : Option.none
    }
  }
}

/**
 * Returns a version of this logger that only logs messages when the log level
 * satisfies the specified predicate.
 *
 * @ets_data_first filterLogLevel_
 */
export function filterLogLevel(f: (logLevel: LogLevel) => boolean) {
  return <Message, Output>(
    self: Logger<Message, Output>
  ): Logger<Message, Option<Output>> => self.filterLogLevel(f)
}
