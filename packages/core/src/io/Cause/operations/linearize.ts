import { HashSet } from "../../../collection/immutable/HashSet"
import type { Cause } from "../definition"
import { Die, Fail, Interrupt, Stackless } from "../definition"

/**
 * Linearizes this cause to a set of parallel causes where each parallel cause
 * contains a linear sequence of failures.
 *
 * @tsplus fluent ets/Cause linearize
 */
export function linearize<E>(self: Cause<E>): HashSet<Cause<E>> {
  return self.fold(
    () => HashSet<Cause<E>>(),
    (e, trace) => HashSet<Cause<E>>().add(new Fail(e, trace)),
    (d, trace) => HashSet<Cause<E>>().add(new Die(d, trace)),
    (fiberId, trace) => HashSet<Cause<E>>().add(new Interrupt(fiberId, trace)),
    (left, right) => left.flatMap((l) => right.map((r) => l + r)),
    (left, right) => left | right,
    (cause, stackless) => cause.map((c) => new Stackless(c, stackless))
  )
}
