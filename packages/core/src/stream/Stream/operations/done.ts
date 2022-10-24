/**
 * A stream that ends with the specified `Exit` value.
 *
 * @tsplus static effect/core/stream/Stream.Ops done
 * @category constructors
 * @since 1.0.0
 */
export function done<E, A>(exit: Exit<E, A>): Stream<never, E, A> {
  return Stream.fromEffect(Effect.done(exit))
}
