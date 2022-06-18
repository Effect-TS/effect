/**
 * @tsplus static ets/Stream/Ops fromPull
 */
export function fromPull<R, E, A>(
  effect: LazyArg<Effect<R | Scope, never, Effect<R, Maybe<E>, Chunk<A>>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.unwrapScoped(
    effect().map((pull) => Stream.repeatEffectChunkMaybe(pull))
  )
}
