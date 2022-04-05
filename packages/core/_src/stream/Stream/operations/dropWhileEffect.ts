/**
 * Drops all elements of the stream for as long as the specified predicate
 * produces an effect that evalutates to `true`.
 *
 * @tsplus fluent ets/Stream dropWhileEffect
 */
export function dropWhileEffect_<R, E, A, R2, E2>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, boolean>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A> {
  return self.pipeThrough(Sink.dropWhileEffect(f));
}

/**
 * Drops all elements of the stream for as long as the specified predicate
 * produces an effect that evalutates to `true`.
 *
 * @tsplus static ets/Stream/Aspects dropWhileEffect
 */
export const dropWhileEffect = Pipeable(dropWhileEffect_);
