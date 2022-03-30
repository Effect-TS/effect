import type { Journal } from "../../STM/Journal"
import type { TRef } from "../definition"
import { getOrMakeEntry } from "./_internal/getOrMakeEntry"

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
 */
export const unsafeSet = Pipeable(unsafeSet_)
