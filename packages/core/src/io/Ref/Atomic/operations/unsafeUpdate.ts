import type { Atomic } from "../Atomic"

/**
 * @tsplus fluent ets/AtomicRef unsafeUpdate
 */
export function unsafeUpdate_<A>(self: Atomic<A>, f: (a: A) => A): void {
  self.value.set(f(self.value.get))
}

/**
 * @ets_data_first unsafeUpdate_
 */
export function unsafeUpdate<A>(f: (a: A) => A) {
  return (self: Atomic<A>): void => self.unsafeUpdate(f)
}
