import type { Journal } from "@effect/core/stm/STM/Journal";
import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry";

/**
 * Unsafely retrieves the value of the `TRef`.
 *
 * @tsplus fluent ets/TRef unsafeGet
 */
export function unsafeGet_<A>(self: TRef<A>, journal: Journal): A {
  const entry = getOrMakeEntry(self, journal);
  return entry.use((_) => _.unsafeGet());
}

/**
 * Unsafely retrieves the value of the `TRef`.
 *
 * @tsplus static ets/TRef/Aspects unsafeGet
 */
export const unsafeGet = Pipeable(unsafeGet_);
