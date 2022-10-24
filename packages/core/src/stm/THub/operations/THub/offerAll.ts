/**
 * @tsplus static effect/core/stm/THub.Aspects offerAll
 * @tsplus pipeable effect/core/stm/THub offerAll
 * @category mutations
 * @since 1.0.0
 */
export function offerAll<A>(as: Iterable<A>) {
  return (self: THub<A>): STM<never, never, boolean> => self.publishAll(as)
}
