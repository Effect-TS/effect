/**
 * Updates some values of the variable but leaves others alone.
 *
 * @tsplus fluent ets/TRef updateSomeAndGet
 */
export function updateSomeAndGet_<A>(self: TRef<A>, pf: (a: A) => Maybe<A>): USTM<A> {
  return self.updateAndGet((a) => pf(a).getOrElse(a))
}

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @tsplus static ets/TRef/Aspects updateSomeAndGet
 */
export const updateSomeAndGet = Pipeable(updateSomeAndGet_)
