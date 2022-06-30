/**
 * The moral equivalent of `if (!p) exp`
 *
 * @tsplus static effect/core/io/Effect.Aspects unless
 * @tsplus pipeable effect/core/io/Effect unless
 */
export function unless(predicate: LazyArg<boolean>, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, Maybe<A>> =>
    Effect.suspendSucceed(predicate() ? Effect.none : self.asSome)
}
