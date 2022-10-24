import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry"

/**
 * Updates the value of the variable and returns the new value.
 *
 * @tsplus static effect/core/stm/TRef.Aspects updateAndGet
 * @tsplus pipeable effect/core/stm/TRef updateAndGet
 * @category mutations
 * @since 1.0.0
 */
export function updateAndGet<A>(f: (a: A) => A) {
  return (self: TRef<A>): STM<never, never, A> =>
    STM.Effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      const newValue = entry.use((_) => f(_.unsafeGet()))
      entry.use((_) => _.unsafeSet(newValue))
      return newValue
    })
}
