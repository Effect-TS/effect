/**
 * Unearth the unchecked failure of the effect (opposite of `orDie`).
 *
 * @tsplus fluent ets/Effect resurrect
 */
export function resurrect<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, unknown, A> {
  return self.unrefineWith(Maybe.some, identity)
}
