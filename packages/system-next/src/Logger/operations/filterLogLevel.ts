// ets_tracing: off

import type { LogLevel } from "../../LogLevel"
import * as O from "../../Option"
import type { Logger } from "../definition"

/**
 * Returns a version of this logger that only logs messages when the log level
 * satisfies the specified predicate.
 */
export function filterLogLevel_<Message, Output>(
  self: Logger<Message, Output>,
  f: (logLevel: LogLevel) => boolean
): Logger<Message, O.Option<Output>> {
  return (trace, fiberId, logLevel, message, context, spans, location) => {
    return f(logLevel)
      ? O.some(self(trace, fiberId, logLevel, message, context, spans, location))
      : O.none
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
  ): Logger<Message, O.Option<Output>> => filterLogLevel_(self, f)
}
