import * as Option from "@fp-ts/data/Option"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of the
 * specified effect.
 *
 * @tsplus static effect/core/stm/STM.Aspects orElseOptional
 * @tsplus pipeable effect/core/stm/STM orElseOptional
 * @category alternatives
 * @since 1.0.0
 */
export function orElseOptional<R1, E1, A1>(that: LazyArg<STM<R1, Option.Option<E1>, A1>>) {
  return <R, E, A>(self: STM<R, Option.Option<E>, A>): STM<R | R1, Option.Option<E | E1>, A | A1> =>
    self.catchAll((option) => {
      switch (option._tag) {
        case "None": {
          return that()
        }
        case "Some": {
          return STM.fail(Option.some<E | E1>(option.value))
        }
      }
    })
}
