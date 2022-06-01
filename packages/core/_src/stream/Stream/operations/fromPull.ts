/**
 * @tsplus static ets/Stream/Ops fromPull
 */
export function fromPull<R, E, A>(
  effect: LazyArg<Effect<R | Scope, never, Effect<R, Option<E>, Chunk<A>>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.unwrapScoped(
    effect().map((pull) => Stream.repeatEffectChunkOption(pull))
  )
}
