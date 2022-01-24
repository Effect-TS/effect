import type * as O from "../../../../data/Option"
import type { Atomic } from "../Atomic"
import * as T from "./_internal/effect"

export function getAndUpdateSome_<A>(
  self: Atomic<A>,
  f: (a: A) => O.Option<A>,
  __trace?: string
): T.UIO<A> {
  return T.succeed(() => {
    const v = self.value.get
    const o = f(v)
    if (o._tag === "Some") {
      self.value.set(o.value)
    }
    return v
  }, __trace)
}

/**
 * @ets_data_first getAndUpdateSome_
 */
export function getAndUpdateSome<A>(f: (a: A) => O.Option<A>, __trace?: string) {
  return (self: Atomic<A>): T.UIO<A> => getAndUpdateSome_(self, f, __trace)
}
