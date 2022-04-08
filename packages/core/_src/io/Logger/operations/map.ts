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
  };
}

/**
 * @tsplus static ets/Logger/Aspects map
 */
export const map = Pipeable(map_);
