/**
 * @tsplus static effect/core/io/Logger.Aspects map
 * @tsplus pipeable effect/core/io/Logger map
 */
export function map<Output, B>(f: (output: Output) => B) {
  return <Message>(self: Logger<Message, Output>): Logger<Message, B> => ({
    apply: (trace, fiberId, logLevel, message, cause, context, spans, annotations) =>
      f(
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
  })
}
