/**
 * Returns whether this effect is a failure.
 *
 * @tsplus getter ets/STM isFailure
 */
export function isFailure<R, E, A>(self: STM<R, E, A>): STM<R, never, boolean> {
  return self.fold(() => true, () => false)
}
