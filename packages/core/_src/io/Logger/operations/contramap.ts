/**
 * @tsplus fluent ets/Logger contramap
 */
export function contramap_<Message, Output, Message1>(
  self: Logger<Message, Output>,
  f: (message: Message1) => Message
): Logger<Message1, Output> {
  return {
    apply: (trace, fiberId, logLevel, message, cause, context, spans, annotations) =>
      self.apply(
        trace,
        fiberId,
        logLevel,
        () => f(message()),
        cause,
        context,
        spans,
        annotations
      )
  }
}

/**
 * @tsplus type ets/Logger/Aspects contramap
 */
export function contramap<Message1, Message>(f: (message: Message1) => Message) {
  return <Output>(self: Logger<Message, Output>): Logger<Message1, Output> => self.contramap(f)
}
