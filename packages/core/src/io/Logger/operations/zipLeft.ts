import type { Logger } from "../definition"

/**
 * @tsplus operator ets/Logger <
 * @tsplus fluent ets/Logger zipLeft
 */
export function zipLeft_<Message, Message1, Output, Output1>(
  self: Logger<Message, Output>,
  that: Logger<Message1, Output1>
): Logger<Message & Message1, Output> {
  return (self + that).map((tuple) => tuple.get(0) as Output)
}

/**
 * @ets_data_first zipLeft_
 */
export function zipLeft<Message, Output1>(that: Logger<Message, Output1>) {
  return <Output>(self: Logger<Message, Output>): Logger<Message, Output> => self < that
}
