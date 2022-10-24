import type { Option } from "@fp-ts/data/Option"

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @tsplus static effect/core/io/Effect.Aspects unless
 * @tsplus pipeable effect/core/io/Effect unless
 * @category mutations
 * @since 1.0.0
 */
export function unless(predicate: LazyArg<boolean>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, Option<A>> =>
    Effect.suspendSucceed(predicate() ? Effect.none : self.asSome)
}
