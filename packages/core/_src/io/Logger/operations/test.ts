/**
 * @tsplus static effect/core/io/Logger.Aspects test
 * @tsplus pipeable effect/core/io/Logger test
 */
export function test<Message>(input: Message) {
  return <Output>(self: Logger<Message, Output>): Output =>
    self.apply(
      FiberId.none,
      LogLevel.Info,
      () => input,
      () => Cause.empty,
      ImmutableMap.empty(),
      List.empty(),
      ImmutableMap.empty()
    )
}
