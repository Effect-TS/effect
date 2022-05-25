import type { Journal } from "@effect/core/stm/STM/Journal"
import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry"

/**
 * Unsafely sets the value of the `TRef`.
 *
 * @tsplus fluent ets/TRef unsafeSet
 */
export function unsafeSet_<A>(self: TRef<A>, value: A, journal: Journal): void {
  const entry = getOrMakeEntry(self, journal)
  entry.use((_) => _.unsafeSet(value))
  return undefined
}

/**
 * Unsafely sets the value of the `TRef`.
 *
 * @tsplus static ets/TRef/Aspects unsafeSet
 */
export const unsafeSet = Pipeable(unsafeSet_)
