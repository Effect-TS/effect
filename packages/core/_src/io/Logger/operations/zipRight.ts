/**
 * @tsplus operator ets/Logger >
 * @tsplus fluent ets/Logger zipRight
 */
export function zipRight_<Message, Message1, Output, Output1>(
  self: Logger<Message, Output>,
  that: Logger<Message1, Output1>
): Logger<Message & Message1, Output1> {
  return (self + that).map((tuple) => tuple.get(1) as Output1);
}

/**
 * @tsplus static ets/Logger/Aspects zipRight
 */
export const zipRight = Pipeable(zipRight_);
