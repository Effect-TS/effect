import type { Atomic } from "../Atomic"
import * as T from "./_internal/effect"

export function updateAndGet_<A>(
  self: Atomic<A>,
  f: (a: A) => A,
  __trace?: string
): T.UIO<A> {
  return T.succeed(() => {
    self.value = f(self.value)
    return self.value
  }, __trace)
}

/**
 * @ets_data_first updateAndGet_
 */
export function updateAndGet<A>(f: (a: A) => A, __trace?: string) {
  return (self: Atomic<A>): T.UIO<A> => updateAndGet_(self, f, __trace)
}
