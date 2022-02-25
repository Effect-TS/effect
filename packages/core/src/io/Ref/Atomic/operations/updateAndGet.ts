import { Effect } from "../../../Effect"
import type { Atomic } from "../Atomic"

export function updateAndGet_<A>(
  self: Atomic<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect<unknown, never, A> {
  return Effect.succeed(() => {
    self.value.set(f(self.value.get))
    return self.value.get
  })
}

/**
 * @ets_data_first updateAndGet_
 */
export function updateAndGet<A>(f: (a: A) => A, __tsplusTrace?: string) {
  return (self: Atomic<A>): Effect<unknown, never, A> => updateAndGet_(self, f)
}
