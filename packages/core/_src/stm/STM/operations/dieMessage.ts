/**
 * Kills the fiber running the effect with a `RuntimeError` that contains
 * the specified message.
 *
 * @tsplus static ets/STM/Ops dieMessage
 */
export function dieMessage(message: LazyArg<string>): STM<unknown, never, never> {
  return STM.succeed(() => {
    throw new RuntimeError(message());
  });
}
