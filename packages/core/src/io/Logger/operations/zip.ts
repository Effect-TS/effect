import type { MergeTuple } from "../../../collection/immutable/Tuple"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { Logger } from "../definition"

/**
 * Combines this logger with the specified logger to produce a new logger that
 * logs to both this logger and that logger.
 *
 * @tsplus operator ets/Logger +
 * @tsplus fluent ets/Logger zip
 */
export function zip_<Message, Message1, Output, Output1>(
  self: Logger<Message, Output>,
  that: Logger<Message1, Output1>
): Logger<Message & Message1, MergeTuple<Output, Output1>> {
  return {
    apply: (trace, fiberId, logLevel, message, cause, context, spans, annotations) =>
      Tuple.mergeTuple(
        self.apply(
          trace,
          fiberId,
          logLevel,
          message,
          cause,
          context,
          spans,
          annotations
        ),
        that.apply(
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
  }
}

/**
 * Combines this logger with the specified logger to produce a new logger that
 * logs to both this logger and that logger.
 *
 * @ets_data_first zip_
 */
export function zip<Message1, Output1>(that: Logger<Message1, Output1>) {
  return <Message, Output>(
    self: Logger<Message, Output>
  ): Logger<Message & Message1, MergeTuple<Output, Output1>> => self.zip(that)
}
