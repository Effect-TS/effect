/**
 * @tsplus fluent ets/Logger test
 */
export function test_<Message, Output>(
  self: Logger<Message, Output>,
  input: Message
): Output {
  return self.apply(
    TraceElement.empty,
    FiberId.none,
    LogLevel.Info,
    () => input,
    () => Cause.empty,
    ImmutableMap.empty(),
    List.empty(),
    ImmutableMap.empty()
  );
}

/**
 * @tsplus static ets/Logger/Aspects test
 */
export const test = Pipeable(test_);
