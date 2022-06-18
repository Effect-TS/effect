/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 *
 * @tsplus fluent ets/TRef getAndUpdateSome
 */
export function getAndUpdateSome_<A>(self: TRef<A>, pf: (a: A) => Maybe<A>): USTM<A> {
  return self.getAndUpdate((a) => pf(a).getOrElse(a))
}

/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 *
 * @tsplus static ets/TRef/Aspects getAndUpdateSome
 */
export const getAndUpdateSome = Pipeable(getAndUpdateSome_)
