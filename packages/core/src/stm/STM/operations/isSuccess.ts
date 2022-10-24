/**
 * Returns whether this effect is a success.
 *
 * @tsplus getter effect/core/stm/STM isSuccess
 * @category getters
 * @since 1.0.0
 */
export function isSuccess<R, E, A>(self: STM<R, E, A>): STM<R, never, boolean> {
  return self.fold(() => false, () => true)
}
