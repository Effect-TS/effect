/**
 * Get the first index of a specific value in the array or -1 if it does not
 * occur.
 *
 * @tsplus static effect/core/stm/TArray.Aspects indexOf
 * @tsplus pipeable effect/core/stm/TArray indexOf
 * @category elements
 * @since 1.0.0
 */
export function indexOf<A>(value: A) {
  return (self: TArray<A>): STM<never, never, number> => self.indexOfFrom(value, 0)
}
