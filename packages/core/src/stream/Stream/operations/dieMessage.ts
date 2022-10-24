/**
 * The stream that dies with an exception described by `msg`.
 *
 * @tsplus static effect/core/stream/Stream.Ops dieMessage
 * @category constructors
 * @since 1.0.0
 */
export function dieMessage(message: string): Stream<never, never, never> {
  return Stream.fromEffect(Effect.dieMessage(message))
}
