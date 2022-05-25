/**
 * Creates a stream from an effect producing values of type `A` until it fails
 * with `None`.
 *
 * @tsplus static ets/Stream/Ops repeatEffectOption
 */
export function repeatEffectOption<R, E, A>(
  effect: LazyArg<Effect<R, Option<E>, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.repeatEffectChunkOption(effect().map(Chunk.single))
}
