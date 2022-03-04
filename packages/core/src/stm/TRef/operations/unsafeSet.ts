import type { Journal } from "../../STM/Journal"
import { getOrMakeEntry } from "../Atomic"
import type { XTRef } from "../definition"
import { concrete } from "../definition"

/**
 * Unsafely sets the value of the `XTRef`.
 *
 * @tsplus fluent ets/XTRef unsafeSet
 */
export function unsafeSet_<EA, EB, A, B>(
  self: XTRef<EA, EB, A, B>,
  value: A,
  journal: Journal
): void {
  concrete(self)
  return getOrMakeEntry(self.atomic, journal).use((_) => _.unsafeSet(value))
}

/**
 * Unsafely sets the value of the `XTRef`.
 *
 * @ets_data_first unsafeSet_
 */
export function unsafeSet<A>(value: A, journal: Journal) {
  return <EA, EB, B>(self: XTRef<EA, EB, A, B>): void => self.unsafeSet(value, journal)
}
