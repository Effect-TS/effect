import * as HS from "../../../collection/immutable/HashSet"
import type { Cause } from "../definition"
import * as C from "../definition"
import { fold_ } from "./fold"

/**
 * Linearizes this cause to a set of parallel causes where each parallel cause
 * contains a linear sequence of failures.
 */
export function linearize<E>(self: Cause<E>): HS.HashSet<Cause<E>> {
  return fold_(
    self,
    () => HS.make<Cause<E>>(),
    (e, trace) => HS.mutate_(HS.make<Cause<E>>(), HS.add(C.fail(e, trace))),
    (d, trace) => HS.mutate_(HS.make<Cause<E>>(), HS.add<Cause<E>>(C.die(d, trace))),
    (fiberId, trace) =>
      HS.mutate_(HS.make<Cause<E>>(), HS.add<Cause<E>>(C.interrupt(fiberId, trace))),
    (left, right) => HS.chain_(left, (l) => HS.map_(right, (r) => C.then(l, r))),
    (left, right) => HS.union_(left, right),
    (cause, stackless) => HS.map_(cause, (c) => new C.Stackless(c, stackless))
  )
}
