// ets_tracing: off

import type { Atomic } from "../Atomic"
import * as T from "./_internal/effect"

export function update_<A>(
  self: Atomic<A>,
  f: (a: A) => A,
  __trace?: string
): T.UIO<void> {
  return T.succeed(() => {
    self.value.set(f(self.value.get))
  }, __trace)
}

/**
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A, __trace?: string) {
  return (self: Atomic<A>): T.UIO<void> => update_(self, f, __trace)
}
