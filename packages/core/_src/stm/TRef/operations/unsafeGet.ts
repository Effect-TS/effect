import type { Journal } from "@effect/core/stm/STM/definition/primitives"
import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry"

/**
 * Unsafely retrieves the value of the `TRef`.
 *
 * @tsplus static effect/core/stm/TRef.Aspects unsafeGet
 * @tsplus pipeable effect/core/stm/TRef unsafeGet
 */
export function unsafeGet(journal: Journal) {
  return <A>(self: TRef<A>): A => {
    const entry = getOrMakeEntry(self, journal)
    return entry.use((_) => _.unsafeGet())
  }
}
