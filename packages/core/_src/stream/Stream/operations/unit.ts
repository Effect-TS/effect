/**
 * Returns a stream that contains a single `undefined` value.
 *
 * @tsplus static ets/Stream/Ops unit
 */
export const unit: Stream<never, never, void> = Stream.succeed(() => undefined)
