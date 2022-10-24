import type { Option } from "@fp-ts/data/Option"

/**
 * Perfoms the specified operation while "zoomed in" on the `Some` case of an
 * `Maybe`.
 *
 * @tsplus static effect/core/io/Effect.Aspects someWith
 * @tsplus pipeable effect/core/io/Effect someWith
 * @category getters
 * @since 1.0.0
 */
export function someWith<R, E, A, R1, E1, A1>(
  f: (effect: Effect<R, Option<E>, A>) => Effect<R1, Option<E1>, A1>
) {
  return (self: Effect<R, E, Option<A>>): Effect<R | R1, E | E1, Option<A1>> =>
    Effect.suspendSucceed(f(self.some).unsome)
}
