import * as List from "@fp-ts/data/List"

/**
 * @tsplus static effect/core/io/Logger.Aspects test
 * @tsplus pipeable effect/core/io/Logger test
 * @category constructors
 * @since 1.0.0
 */
export function test<Message>(input: Message) {
  return <Output>(self: Logger<Message, Output>): Output =>
    self.apply(
      FiberId.none,
      LogLevel.Info,
      input,
      Cause.empty,
      new FiberRefs(new Map()),
      List.nil(),
      new Map()
    )
}
