/**
 * @tsplus static effect/core/stm/THub.Aspects offerAll
 * @tsplus pipeable effect/core/stm/THub offerAll
 */
export function offerAll<A>(as: Collection<A>) {
  return (self: THub<A>): STM<never, never, boolean> => self.publishAll(as)
}
