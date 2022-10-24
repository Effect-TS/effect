/**
 * Returns whether this effect is a failure.
 *
 * @tsplus getter effect/core/stm/STM isFailure
 * @category getters
 * @since 1.0.0
 */
export function isFailure<R, E, A>(self: STM<R, E, A>): STM<R, never, boolean> {
  return self.fold(() => true, () => false)
}
