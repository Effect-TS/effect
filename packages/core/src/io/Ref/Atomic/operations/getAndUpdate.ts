import { Effect } from "../../../Effect"
import type { Atomic } from "../Atomic"

export function getAndUpdate_<A>(
  self: Atomic<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect<unknown, never, A> {
  return Effect.succeed(() => {
    const v = self.value.get
    self.value.set(f(v))
    return v
  })
}

/**
 * @ets_data_first getAndUpdate_
 */
export function getAndUpdate<A>(f: (a: A) => A, __tsplusTrace?: string) {
  return (self: Atomic<A>): Effect<unknown, never, A> => getAndUpdate_(self, f)
}
