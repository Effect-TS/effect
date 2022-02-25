import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { Atomic } from "../Atomic"

export function updateSomeAndGet_<A>(
  self: Atomic<A>,
  f: (a: A) => Option<A>,
  __tsplusTrace?: string
): Effect<unknown, never, A> {
  return Effect.succeed(() => {
    const o = f(self.value.get)
    if (o._tag === "Some") {
      self.value.set(o.value)
    }
    return self.value.get
  })
}

/**
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(f: (a: A) => Option<A>, __tsplusTrace?: string) {
  return (self: Atomic<A>): Effect<unknown, never, A> => updateSomeAndGet_(self, f)
}
