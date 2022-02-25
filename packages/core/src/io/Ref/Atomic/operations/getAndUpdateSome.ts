import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { Atomic } from "../Atomic"

export function getAndUpdateSome_<A>(
  self: Atomic<A>,
  f: (a: A) => Option<A>,
  __tsplusTrace?: string
): Effect<unknown, never, A> {
  return Effect.succeed(() => {
    const v = self.value.get
    const o = f(v)
    if (o._tag === "Some") {
      self.value.set(o.value)
    }
    return v
  })
}

/**
 * @ets_data_first getAndUpdateSome_
 */
export function getAndUpdateSome<A>(f: (a: A) => Option<A>, __tsplusTrace?: string) {
  return (self: Atomic<A>): Effect<unknown, never, A> => getAndUpdateSome_(self, f)
}
