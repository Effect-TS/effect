/**
 * Creates a stream from an effect producing values of type `A` until it fails
 * with `None`.
 *
 * @tsplus static effect/core/stream/Stream.Ops repeatEffectMaybe
 */
export function repeatEffectMaybe<R, E, A>(
  effect: LazyArg<Effect<R, Maybe<E>, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.repeatEffectChunkMaybe(effect().map(Chunk.single))
}
