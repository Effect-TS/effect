import { Option } from "../../../data/Option"
import * as FiberId from "../../FiberId"
import type { Runtime } from "../../FiberRef"
import type { Fiber } from "../definition"
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
    await: self.await.zipWith(that.await, (e1, e2) =>
      e1._tag === "Success" ? e1 : e2
    ),
    children: self.children,
    getRef: (ref) =>
      self
        .getRef(ref)
        .zipWith(that.getRef(ref), (first, second) =>
          first === (ref as Runtime<any>).initial ? second : first
        ),
    inheritRefs: that.inheritRefs > self.inheritRefs,
    interruptAs: (id) => self.interruptAs(id) > that.interruptAs(id),
    poll: self.poll.zipWith(that.poll, (o1, o2) =>
      o1.fold(Option.none, (_) => (_._tag === "Success" ? o1 : o2))
    )
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
