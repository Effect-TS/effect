import type * as O from "../../../Option"
import type { Atomic } from "../Atomic"
import * as T from "./_internal/effect"

export function updateSomeAndGet_<A>(
  self: Atomic<A>,
  f: (a: A) => O.Option<A>,
  __trace?: string
): T.UIO<A> {
  return T.succeed(() => {
    const o = f(self.value)

    if (o._tag === "Some") {
      self.value = o.value
    }

    return self.value
  }, __trace)
}

/**
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(f: (a: A) => O.Option<A>, __trace?: string) {
  return (self: Atomic<A>): T.UIO<A> => updateSomeAndGet_(self, f, __trace)
}
