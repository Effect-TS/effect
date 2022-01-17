import type { Logger } from "../definition"

export function contramap_<Message, Output, Message1>(
  self: Logger<Message, Output>,
  f: (message: Message1) => Message
): Logger<Message1, Output> {
  return (trace, fiberId, logLevel, message, context, spans, location) =>
    self(trace, fiberId, logLevel, () => f(message()), context, spans, location)
}

/**
 * @ets_data_first contramap_
 */
export function contramap<Message1, Message>(f: (message: Message1) => Message) {
  return <Output>(self: Logger<Message, Output>): Logger<Message1, Output> =>
    contramap_(self, f)
}
