/**
 * Creates a stream from an effect producing chunks of `A` values which
 * repeats forever.
 *
 * @tsplus static effect/core/stream/Stream.Ops repeatEffectChunk
 */
export function repeatEffectChunk<R, E, A>(
  effect: LazyArg<Effect<R, E, Chunk<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.repeatEffectChunkMaybe(effect().mapError(Maybe.some))
}
