import type { Journal } from "../../STM/Journal"
import type { TRef } from "../definition"
import { getOrMakeEntry } from "./_internal/getOrMakeEntry"

/**
 * Unsafely retrieves the value of the `TRef`.
 *
 * @tsplus fluent ets/TRef unsafeGet
 */
export function unsafeGet_<A>(self: TRef<A>, journal: Journal): A {
  const entry = getOrMakeEntry(self, journal)
  return entry.use((_) => _.unsafeGet())
}

/**
 * Unsafely retrieves the value of the `TRef`.
 */
export const unsafeGet = Pipeable(unsafeGet_)
