/**
 * Creates a stream from an effect producing chunks of `A` values until it
 * fails with `None`.
 *
 * @tsplus static effect/core/stream/Stream.Ops repeatEffectChunkMaybe
 */
export function repeatEffectChunkMaybe<R, E, A>(
  effect: LazyArg<Effect<R, Maybe<E>, Chunk<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.unfoldChunkEffect(effect, (eff) =>
    eff
      .map((chunk) => Maybe.some(Tuple(chunk, eff)))
      .catchAll((option) => option.fold(Effect.none, (e) => Effect.fail(e))))
}
