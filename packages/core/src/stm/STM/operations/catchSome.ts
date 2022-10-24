import type { Option } from "@fp-ts/data/Option"

/**
 * Recovers from some or all of the error cases.
 *
 * @tsplus static effect/core/stm/STM.Aspects catchSome
 * @tsplus pipeable effect/core/stm/STM catchSome
 * @category alternatives
 * @since 1.0.0
 */
export function catchSome<E, R1, E1, B>(
  f: (e: E) => Option<STM<R1, E1, B>>
) {
  return <R, A>(self: STM<R, E, A>): STM<R1 | R, E | E1, A | B> =>
    self.catchAll((e): STM<R1, E | E1, A | B> => {
      const option = f(e)
      switch (option._tag) {
        case "None": {
          return STM.fail(e)
        }
        case "Some": {
          return option.value
        }
      }
    })
}
