/**
 * Get the first index of a specific value in the arrayor -1 if it does not
 * occur.
 *
 * @tsplus static effect/core/stm/TArray.Aspects lastIndexOf
 * @tsplus pipeable effect/core/stm/TArray lastIndexOf
 * @category elements
 * @since 1.0.0
 */
export function lastIndexOf<A>(value: A) {
  return (self: TArray<A>): STM<never, never, number> =>
    self.lastIndexOfFrom(value, self.length - 1)
}
