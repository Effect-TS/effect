import type { Logger } from "../definition"

/**
 * @tsplus fluent ets/Logger map
 */
export function map_<Message, Output, B>(
  self: Logger<Message, Output>,
  f: (output: Output) => B
): Logger<Message, B> {
  return {
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
  }
}

/**
 * @ets_data_first map_
 */
export function map<Output, B>(f: (output: Output) => B) {
  return <Message>(self: Logger<Message, Output>): Logger<Message, B> => self.map(f)
}
