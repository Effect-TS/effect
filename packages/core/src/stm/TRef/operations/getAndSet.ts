import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry"

/**
 * Sets the value of the `TRef` and returns the old value.
 *
 * @tsplus static effect/core/stm/TRef.Aspects getAndSet
 * @tsplus pipeable effect/core/stm/TRef getAndSet
 * @category mutations
 * @since 1.0.0
 */
export function getAndSet<A>(value: A) {
  return (self: TRef<A>): STM<never, never, A> =>
    STM.Effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      const oldValue = entry.use((_) => _.unsafeGet<A>())
      entry.use((_) => _.unsafeSet(value))
      return oldValue
    })
}
