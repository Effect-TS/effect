/**
 * @tsplus static effect/core/stream/Stream.Ops fromPull
 */
export function fromPull<R, E, A>(
  effect: Effect<R | Scope, never, Effect<R, Maybe<E>, Chunk<A>>>
): Stream<R, E, A> {
  return Stream.unwrapScoped(effect.map((pull) => Stream.repeatEffectChunkMaybe(pull)))
}
