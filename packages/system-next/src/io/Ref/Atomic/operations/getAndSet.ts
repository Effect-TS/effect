import { Effect } from "../../../Effect"
import type { Atomic } from "../Atomic"

export function getAndSet_<A>(
  self: Atomic<A>,
  value: A,
  __etsTrace?: string
): Effect<unknown, never, A> {
  return Effect.succeed(() => {
    const v = self.value.get
    self.value.set(value)
    return v
  })
}

/**
 * @ets_data_first getAndSet_
 */
export function getAndSet<A>(value: A, __etsTrace?: string) {
  return (self: Atomic<A>): Effect<unknown, never, A> => getAndSet_(self, value)
}
