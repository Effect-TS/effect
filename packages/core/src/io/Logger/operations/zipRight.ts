/**
 * @tsplus pipeable-operator effect/core/io/Logger >
 * @tsplus static effect/core/io/Logger.Aspects zipRight
 * @tsplus pipeable effect/core/io/Logger zipRight
 * @category zipping
 * @since 1.0.0
 */
export function zipRight<Message1, Output1>(that: Logger<Message1, Output1>) {
  return <Message, Output>(self: Logger<Message, Output>): Logger<Message & Message1, Output1> =>
    (self + that).map((tuple) => tuple[1] as Output1)
}
