/**
 * Returns an effect that dies with a `RuntimeException` having the specified
 * text message. This method can be used for terminating a fiber because a
 * defect has been detected in the code.
 *
 * @tsplus static ets/Effect/Ops dieMessage
 */
export function dieMessage(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Effect.UIO<never> {
  return Effect.failCause(Cause.stackless(Cause.die(new RuntimeError(message()))));
}
