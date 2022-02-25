import type { Logger } from "../definition"

/**
 * @tsplus operator ets/Logger >
 * @tsplus fluent ets/Logger zipRight
 */
export function zipRight_<Message, Message1, Output, Output1>(
  self: Logger<Message, Output>,
  that: Logger<Message1, Output1>
): Logger<Message & Message1, Output1> {
  return (self + that).map((tuple) => tuple.get(1) as Output1)
}

/**
 * @ets_data_first zipRight_
 */
export function zipRight<Message, Output1>(that: Logger<Message, Output1>) {
  return <Output>(self: Logger<Message, Output>): Logger<Message, Output1> =>
    self.zipRight(that)
}
