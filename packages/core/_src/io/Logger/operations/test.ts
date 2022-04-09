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
    new Map(),
    List.empty(),
    new Map()
  );
}

/**
 * @tsplus static ets/Logger/Aspects test
 */
export const test = Pipeable(test_);
