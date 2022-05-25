/**
 * Creates a stream produced from an `Effect`.
 *
 * @tsplus static ets/Stream/Ops unwrap
 */
export function unwrap<R, E, R1, E1, A>(
  effect: LazyArg<Effect<R, E, Stream<R1, E1, A>>>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A> {
  return Stream.fromEffect(effect).flatten()
}
