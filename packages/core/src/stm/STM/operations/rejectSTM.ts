import type { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @tsplus fluent ets/STM rejectSTM
 */
export function rejectSTM_<R, E, A, R1, E1>(
  self: STM<R, E, A>,
  pf: (a: A) => Option<STM<R1, E1, E1>>
): STM<R & R1, E | E1, A> {
  return self.flatMap((a) =>
    pf(a).fold(
      () => STM.succeedNow(a),
      (effect) => effect.flatMap(STM.failNow)
    )
  )
}

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @ets_data_first rejectSTM_
 */
export function rejectSTM<A, R1, E1>(pf: (a: A) => Option<STM<R1, E1, E1>>) {
  return <R, E>(self: STM<R, E, A>): STM<R & R1, E | E1, A> => self.rejectSTM(pf)
}
