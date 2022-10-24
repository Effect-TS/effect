import type { Option } from "@fp-ts/data/Option"

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @tsplus static effect/core/stm/STM.Aspects rejectSTM
 * @tsplus pipeable effect/core/stm/STM rejectSTM
 * @category mutations
 * @since 1.0.0
 */
export function rejectSTM<A, R1, E1>(pf: (a: A) => Option<STM<R1, E1, E1>>) {
  return <R, E>(self: STM<R, E, A>): STM<R | R1, E | E1, A> =>
    self.flatMap((a) => {
      const option = pf(a)
      switch (option._tag) {
        case "None": {
          return STM.succeed(a)
        }
        case "Some": {
          return option.value.flatMap(STM.fail)
        }
      }
    })
}
