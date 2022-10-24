/**
 * @tsplus static effect/core/io/Logger.Aspects contramap
 * @tsplus pipeable effect/core/io/Logger contramap
 * @category mapping
 * @since 1.0.0
 */
export function contramap<Message, Message1>(f: (message: Message1) => Message) {
  return <Output>(self: Logger<Message, Output>): Logger<Message1, Output> => ({
    apply: (fiberId, logLevel, message, cause, context, spans, annotations) =>
      self.apply(
        fiberId,
        logLevel,
        f(message),
        cause,
        context,
        spans,
        annotations
      )
  })
}
