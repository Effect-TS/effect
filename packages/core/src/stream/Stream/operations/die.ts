/**
 * Returns a stream that dies with the specified defect.
 *
 * @tsplus static effect/core/stream/Stream.Ops die
 * @category constructors
 * @since 1.0.0
 */
export function die(defect: unknown): Stream<never, never, never> {
  return Stream.fromEffect(Effect.die(defect))
}
