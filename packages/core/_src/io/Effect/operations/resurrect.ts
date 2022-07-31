/**
 * Unearth the unchecked failure of the effect (opposite of `orDie`).
 *
 * @tsplus getter effect/core/io/Effect resurrect
 */
export function resurrect<R, E, A>(self: Effect<R, E, A>): Effect<R, unknown, A> {
  return self.unrefineWith(Maybe.some, identity)
}
