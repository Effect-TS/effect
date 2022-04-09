/**
 * @tsplus operator ets/Logger <
 * @tsplus fluent ets/Logger zipLeft
 */
export function zipLeft_<Message, Message1, Output, Output1>(
  self: Logger<Message, Output>,
  that: Logger<Message1, Output1>
): Logger<Message & Message1, Output> {
  return (self + that).map((tuple) => tuple.get(0) as Output);
}

/**
 * @tsplus static ets/Logger/Aspects zipLeft
 */
export const zipLeft = Pipeable(zipLeft_);
