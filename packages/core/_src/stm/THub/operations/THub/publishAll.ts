/**
 * @tsplus fluent ets/THub publishAll
 */
export function publishAll_<A>(self: THub<A>, as: Collection<A>): USTM<boolean> {
  return STM.forEach(as, (_) => self.publish(_)).map((_) => _.forAll(identity))
}

/**
 * @tsplus static ets/THub/Aspects publishAll
 */
export const publishAll = Pipeable(publishAll_)
