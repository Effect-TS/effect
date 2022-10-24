import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry"

/**
 * Updates the value of the variable.
 *
 * @tsplus static effect/core/stm/TRef.Aspects update
 * @tsplus pipeable effect/core/stm/TRef update
 * @category mutations
 * @since 1.0.0
 */
export function update<A>(f: (a: A) => A) {
  return (self: TRef<A>): STM<never, never, void> =>
    STM.Effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      const newValue = entry.use((_) => f(_.unsafeGet()))
      entry.use((_) => _.unsafeSet(newValue))
      return undefined
    })
}
