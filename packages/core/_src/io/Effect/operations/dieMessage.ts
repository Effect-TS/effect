/**
 * Returns an effect that dies with a `RuntimeException` having the specified
 * text message. This method can be used for terminating a fiber because a
 * defect has been detected in the code.
 *
 * @tsplus static effect/core/io/Effect.Ops dieMessage
 */
export function dieMessage(message: string): Effect<never, never, never> {
  return Effect.failCauseSync(Cause.die(new RuntimeError(message)))
}
