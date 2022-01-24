import type * as O from "../../../../data/Option"
import type { Atomic } from "../Atomic"
import * as T from "./_internal/effect"

export function updateSomeAndGet_<A>(
  self: Atomic<A>,
  f: (a: A) => O.Option<A>,
  __trace?: string
): T.UIO<A> {
  return T.succeed(() => {
    const o = f(self.value.get)

    if (o._tag === "Some") {
      self.value.set(o.value)
    }

    return self.value.get
  }, __trace)
}

/**
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(f: (a: A) => O.Option<A>, __trace?: string) {
  return (self: Atomic<A>): T.UIO<A> => updateSomeAndGet_(self, f, __trace)
}
