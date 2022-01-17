import type { Atomic } from "../Atomic"
import * as T from "./_internal/effect"

export function getAndUpdate_<A>(
  self: Atomic<A>,
  f: (a: A) => A,
  __trace?: string
): T.UIO<A> {
  return T.succeed(() => {
    const v = self.value.get
    self.value.set(f(v))
    return v
  }, __trace)
}

/**
 * @ets_data_first getAndUpdate_
 */
export function getAndUpdate<A>(f: (a: A) => A, __trace?: string) {
  return (self: Atomic<A>): T.UIO<A> => getAndUpdate_(self, f, __trace)
}
