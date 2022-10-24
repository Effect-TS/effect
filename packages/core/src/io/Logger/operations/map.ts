/**
 * @tsplus static effect/core/io/Logger.Aspects map
 * @tsplus pipeable effect/core/io/Logger map
 * @category mapping
 * @since 1.0.0
 */
export function map<Output, B>(f: (output: Output) => B) {
  return <Message>(self: Logger<Message, Output>): Logger<Message, B> => ({
    apply: (fiberId, logLevel, message, cause, context, spans, annotations) =>
      f(
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
  })
}
