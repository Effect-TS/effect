import * as HS from "../../../collection/immutable/HashSet"
import { Cause, Stackless } from "../definition"

/**
 * Linearizes this cause to a set of parallel causes where each parallel cause
 * contains a linear sequence of failures.
 *
 * @tsplus fluent ets/Cause linearize
 */
export function linearize<E>(self: Cause<E>): HS.HashSet<Cause<E>> {
  return self.fold(
    () => HS.make<Cause<E>>(),
    (e, trace) => HS.mutate_(HS.make<Cause<E>>(), HS.add(Cause.fail(e, trace))),
    (d, trace) =>
      HS.mutate_(HS.make<Cause<E>>(), HS.add<Cause<E>>(Cause.die(d, trace))),
    (fiberId, trace) =>
      HS.mutate_(
        HS.make<Cause<E>>(),
        HS.add<Cause<E>>(Cause.interrupt(fiberId, trace))
      ),
    (left, right) => HS.chain_(left, (l) => HS.map_(right, (r) => Cause.then(l, r))),
    (left, right) => HS.union_(left, right),
    (cause, stackless) => HS.map_(cause, (c) => new Stackless(c, stackless))
  )
}
