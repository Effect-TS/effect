/**
 * Returns a stream that contains a single `undefined` value.
 *
 * @tsplus static effect/core/stream/Stream.Ops unit
 */
export const unit: Stream<never, never, void> = Stream.succeed(() => undefined)
