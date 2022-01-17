import * as FiberId from "../../FiberId"
import * as O from "../../Option"
import type { Fiber } from "../definition"
import * as T from "./_internal/effect"
import { makeSynthetic } from "./makeSynthetic"

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the `that` one
 * when `this` one fails. Interrupting the returned fiber will interrupt both
 * fibers, sequentially, from left to right.
 */
export function orElse_<E, E1, A, A1>(
  self: Fiber<E, A>,
  that: Fiber<E1, A1>
): Fiber<E | E1, A | A1> {
  return makeSynthetic<E | E1, A | A1>({
    id: FiberId.getOrElse_(self.id, () => that.id),
    await: T.zipWith_(self.await, that.await, (e1, e2) =>
      e1._tag === "Success" ? e1 : e2
    ),
    children: self.children,
    getRef: (ref) =>
      T.zipWith_(self.getRef(ref), that.getRef(ref), (a, b) =>
        a === ref.initial ? b : a
      ),
    inheritRefs: T.chain_(that.inheritRefs, () => self.inheritRefs),
    interruptAs: (id) => T.chain_(self.interruptAs(id), () => that.interruptAs(id)),
    poll: T.zipWith_(self.poll, that.poll, (e1, e2) => {
      switch (e1._tag) {
        case "Some": {
          return e1.value._tag === "Success" ? e1 : e2
        }
        case "None": {
          return O.none
        }
      }
    })
  })
}

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the `that` one
 * when `this` one fails. Interrupting the returned fiber will interrupt both
 * fibers, sequentially, from left to right.
 *
 * @ets_data_first orElse_
 */
export function orElse<E1, A1>(that: Fiber<E1, A1>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E | E1, A | A1> => orElse_(self, that)
}
