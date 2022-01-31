import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @tsplus fluent ets/Managed rejectManaged
 */
export function rejectManaged_<R, E, A, R1, E1>(
  self: Managed<R, E, A>,
  pf: (a: A) => Option<Managed<R1, E1, E1>>,
  __etsTrace?: string
) {
  return self.flatMap((a) =>
    pf(a).fold(
      () => Managed.succeedNow(a),
      (managed) => managed.flatMap((e1) => Managed.failNow(e1))
    )
  )
}

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @ets_data_first rejectManaged_
 */
export function rejectManaged<A, R1, E1>(
  pf: (a: A) => Option<Managed<R1, E1, E1>>,
  __etsTrace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> =>
    rejectManaged_(self, pf)
}
