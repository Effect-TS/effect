import type { Journal } from "../../STM/Journal"
import { getOrMakeEntry } from "../Atomic/operations/getOrMakeEntry"
import type { XTRef } from "../definition"
import { concrete } from "../definition"

/**
 * Unsafely retrieves the value of the `XTRef`.
 *
 * @tsplus fluent ets/XTRef unsafeGet
 */
export function unsafeGet_<EA, EB, A, B>(
  self: XTRef<EA, EB, A, B>,
  journal: Journal
): A {
  concrete(self)
  return getOrMakeEntry(self.atomic, journal).use((_) => _.unsafeGet<A>())
}

/**
 * Unsafely retrieves the value of the `XTRef`.
 *
 * @ets_data_first unsafeGet_
 */
export function unsafeGet(journal: Journal) {
  return <EA, EB, A, B>(self: XTRef<EA, EB, A, B>): A => self.unsafeGet(journal)
}
