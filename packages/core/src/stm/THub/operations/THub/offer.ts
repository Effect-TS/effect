/**
 * @tsplus static effect/core/stm/THub.Aspects offer
 * @tsplus pipeable effect/core/stm/THub offer
 */
export function offer<A>(value: A) {
  return (self: THub<A>): STM<never, never, boolean> => self.publish(value)
}
