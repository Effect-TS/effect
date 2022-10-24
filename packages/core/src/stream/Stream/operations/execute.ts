/**
 * Creates a stream that executes the specified effect but emits no elements.
 *
 * @tsplus static effect/core/stream/Stream.Ops execute
 * @category constructors
 * @since 1.0.0
 */
export function execute<R, E, Z>(effect: Effect<R, E, Z>): Stream<R, E, never> {
  return Stream.fromEffect(effect).drain
}
