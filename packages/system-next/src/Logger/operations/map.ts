import type { Logger } from "../definition"

export function map_<Message, Output, B>(
  self: Logger<Message, Output>,
  f: (output: Output) => B
): Logger<Message, B> {
  return (trace, fiberId, logLevel, message, context, spans, location) =>
    f(self(trace, fiberId, logLevel, message, context, spans, location))
}

/**
 * @ets_data_first map_
 */
export function map<Output, B>(f: (output: Output) => B) {
  return <Message>(self: Logger<Message, Output>): Logger<Message, B> => map_(self, f)
}
