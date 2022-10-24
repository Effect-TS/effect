import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry"

/**
 * Sets the value of the `TRef`.
 *
 * @tsplus static effect/core/stm/TRef.Aspects set
 * @tsplus pipeable effect/core/stm/TRef set
 * @category mutations
 * @since 1.0.0
 */
export function set<A>(value: A) {
  return (self: TRef<A>): STM<never, never, void> =>
    STM.Effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      entry.use((_) => _.unsafeSet(value))
      return undefined
    })
}
