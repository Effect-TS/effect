/**
 * A stream that ends with the specified `Exit` value.
 *
 * @tsplus static effect/core/stream/Stream.Ops done
 */
export function done<E, A>(
  exit: LazyArg<Exit<E, A>>
): Stream<never, E, A> {
  return Stream.fromEffect(Effect.done(exit))
}
