import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Combines this logger with the specified logger to produce a new logger that
 * logs to both this logger and that logger.
 *
 * @tsplus pipeable-operator effect/core/io/Logger +
 * @tsplus static effect/core/io/Logger.Aspects zip
 * @tsplus pipeable effect/core/io/Logger zip
 */
export function zip<Message1, Output1>(that: Logger<Message1, Output1>) {
  return <Message, Output>(
    self: Logger<Message, Output>
  ): Logger<Message & Message1, MergeTuple<Output, Output1>> => ({
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
  })
}
