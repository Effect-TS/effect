/**
 * Returns whether this effect is a success.
 *
 * @tsplus fluent ets/STM isSuccess
 */
export function isSuccess<R, E, A>(self: STM<R, E, A>): STM<R, never, boolean> {
  return self.fold(() => false, () => true)
}
