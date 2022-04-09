/**
 * Returns a stream that never produces any value or fails with any error.
 *
 * @tsplus static ets/Stream/Ops never
 */
export const never: Stream<unknown, never, never> = Stream.fromEffect(Effect.never);
