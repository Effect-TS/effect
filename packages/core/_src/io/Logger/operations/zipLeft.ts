/**
 * @tsplus pipeable-operator effect/core/io/Logger <
 * @tsplus static effect/core/io/Logger zipLeft
 * @tsplus pipeable effect/core/io/Logger zipLeft
 */
export function zipLeft<Message1, Output1>(that: Logger<Message1, Output1>) {
  return <Message, Output>(self: Logger<Message, Output>): Logger<Message & Message1, Output> =>
    (self + that).map((tuple) => tuple.get(0) as Output)
}
