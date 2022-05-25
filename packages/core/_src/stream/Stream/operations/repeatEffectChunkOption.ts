/**
 * Creates a stream from an effect producing chunks of `A` values until it
 * fails with `None`.
 *
 * @tsplus static ets/Stream/Ops repeatEffectChunkOption
 */
export function repeatEffectChunkOption<R, E, A>(
  effect: LazyArg<Effect<R, Option<E>, Chunk<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.unfoldChunkEffect(effect, (eff) =>
    eff
      .map((chunk) => Option.some(Tuple(chunk, eff)))
      .catchAll((option) => option.fold(Effect.none, (e) => Effect.fail(e))))
}
