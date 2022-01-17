import type * as O from "../../../Option"
import type { Atomic } from "../Atomic"
import * as T from "./_internal/effect"

export function updateSome_<A>(
  self: Atomic<A>,
  f: (a: A) => O.Option<A>,
  __trace?: string
): T.UIO<void> {
  return T.succeed(() => {
    const o = f(self.value.get)
    if (o._tag === "Some") {
      self.value.set(o.value)
    }
  }, __trace)
}

/**
 * @ets_data_first updateSome_
 */
export function updateSome<A>(f: (a: A) => O.Option<A>, __trace?: string) {
  return (self: Atomic<A>): T.UIO<void> => updateSome_(self, f, __trace)
}
