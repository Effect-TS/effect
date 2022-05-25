/**
 * A stream that ends with the specified `Exit` value.
 *
 * @tsplus static ets/Stream/Ops done
 */
export function done<E, A>(
  exit: LazyArg<Exit<E, A>>,
  __tsplusTrace?: string
): Stream<unknown, E, A> {
  return Stream.fromEffect(Effect.done(exit))
}
