import { Tuple } from "../../../collection/immutable/Tuple"
import type { Logger } from "../definition"

/**
 * Combines this logger with the specified logger to produce a new logger that
 * logs to both this logger and that logger.
 */
export function zip_<Message, Output, Output1>(
  self: Logger<Message, Output>,
  that: Logger<Message, Output1>
): Logger<Message, Tuple<[Output, Output1]>> {
  return (trace, fiberId, logLevel, message, context, spans, location) =>
    Tuple(
      self(trace, fiberId, logLevel, message, context, spans, location),
      that(trace, fiberId, logLevel, message, context, spans, location)
    )
}

/**
 * Combines this logger with the specified logger to produce a new logger that
 * logs to both this logger and that logger.
 *
 * @ets_data_first zip_
 */
export function zip<Message, Output1>(that: Logger<Message, Output1>) {
  return <Output>(
    self: Logger<Message, Output>
  ): Logger<Message, Tuple<[Output, Output1]>> => zip_(self, that)
}
