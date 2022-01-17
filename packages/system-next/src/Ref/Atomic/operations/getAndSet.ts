import type { Atomic } from "../Atomic"
import * as T from "./_internal/effect"

export function getAndSet_<A>(self: Atomic<A>, value: A, __trace?: string): T.UIO<A> {
  return T.succeed(() => {
    const v = self.value.get
    self.value.set(value)
    return v
  }, __trace)
}

/**
 * @ets_data_first getAndSet_
 */
export function getAndSet<A>(value: A, __trace?: string) {
  return (self: Atomic<A>): T.UIO<A> => getAndSet_(self, value, __trace)
}
