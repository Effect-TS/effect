import type { Logger } from "../definition"

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
 * @ets_data_first contramap_
 */
export function contramap<Message1, Message>(f: (message: Message1) => Message) {
  return <Output>(self: Logger<Message, Output>): Logger<Message1, Output> =>
    self.contramap(f)
}
