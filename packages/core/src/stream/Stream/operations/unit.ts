/**
 * Returns a stream that contains a single `undefined` value.
 *
 * @tsplus static effect/core/stream/Stream.Ops unit
 * @category constructors
 * @since 1.0.0
 */
export const unit: Stream<never, never, void> = Stream.succeed(undefined)
