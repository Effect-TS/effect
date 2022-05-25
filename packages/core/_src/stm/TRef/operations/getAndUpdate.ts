import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry"

/**
 * Updates the value of the variable and returns the old value.
 *
 * @tsplus fluent ets/TRef getAndUpdate
 */
export function getAndUpdate_<A>(self: TRef<A>, f: (a: A) => A): USTM<A> {
  return STM.Effect((journal) => {
    const entry = getOrMakeEntry(self, journal)
    const oldValue = entry.use((_) => _.unsafeGet<A>())
    entry.use((_) => _.unsafeSet(f(oldValue)))
    return oldValue
  })
}

/**
 * Updates the value of the variable and returns the old value.
 *
 * @tsplus static ets/TRef/Aspects getAndUpdate
 */
export const getAndUpdate = Pipeable(getAndUpdate_)
