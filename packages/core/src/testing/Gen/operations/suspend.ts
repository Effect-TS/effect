/**
 * Lazily constructs a generator. This is useful to avoid infinite recursion
 * when creating generators that refer to themselves.
 *
 * @tsplus static effect/core/testing/Gen.Ops suspend
 */
export function suspend<R, A>(gen: LazyArg<Gen<R, A>>): Gen<R, A> {
  return Gen.fromEffect(Effect.sync(gen)).flatten
}
