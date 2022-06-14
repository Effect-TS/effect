/**
 * @tsplus fluent ets/THub offerAll
 */
export function offerAll_<A>(self: THub<A>, as: Collection<A>): USTM<boolean> {
  return self.publishAll(as)
}

/**
 * @tsplus static ets/THub/Aspects offerAll
 */
export const offerAll = Pipeable(offerAll_)
