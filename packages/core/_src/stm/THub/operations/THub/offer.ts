/**
 * @tsplus fluent ets/THub offer
 */
export function offer_<A>(self: THub<A>, a: A): USTM<boolean> {
  return self.publish(a)
}

/**
 * @tsplus static ets/THub/Aspects offer
 */
export const offer = Pipeable(offer_)
