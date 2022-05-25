/**
 * Creates a stream from an effect producing chunks of `A` values which
 * repeats forever.
 *
 * @tsplus static ets/Stream/Ops repeatEffectChunk
 */
export function repeatEffectChunk<R, E, A>(
  effect: LazyArg<Effect<R, E, Chunk<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.repeatEffectChunkOption(effect().mapError(Option.some))
}
