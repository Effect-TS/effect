/**
 * Returns a stream that never produces any value or fails with any error.
 *
 * @tsplus static effect/core/stream/Stream.Ops never
 * @category constructors
 * @since 1.0.0
 */
export const never: Stream<never, never, never> = Stream.fromEffect(Effect.never)
