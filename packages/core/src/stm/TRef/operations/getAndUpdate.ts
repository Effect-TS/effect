import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry"

/**
 * Updates the value of the variable and returns the old value.
 *
 * @tsplus static effect/core/stm/TRef.Aspects getAndUpdate
 * @tsplus pipeable effect/core/stm/TRef getAndUpdate
 */
export function getAndUpdate<A>(f: (a: A) => A) {
  return (self: TRef<A>): STM<never, never, A> =>
    STM.Effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      const oldValue = entry.use((_) => _.unsafeGet<A>())
      entry.use((_) => _.unsafeSet(f(oldValue)))
      return oldValue
    })
}
