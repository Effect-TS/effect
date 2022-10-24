import type { Journal } from "@effect/core/stm/STM/definition/primitives"
import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry"

/**
 * Unsafely sets the value of the `TRef`.
 *
 * @tsplus static effect/core/stm/TRef.Aspects unsafeSet
 * @tsplus pipeable effect/core/stm/TRef unsafeSet
 * @category mutations
 * @since 1.0.0
 */
export function unsafeSet<A>(value: A, journal: Journal) {
  return (self: TRef<A>): void => {
    const entry = getOrMakeEntry(self, journal)
    entry.use((_) => _.unsafeSet(value))
    return undefined
  }
}
