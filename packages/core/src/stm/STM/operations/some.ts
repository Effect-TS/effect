import * as Option from "@fp-ts/data/Option"

/**
 * Converts an option on values into an option on errors.
 *
 * @tsplus getter effect/core/stm/STM some
 * @category getters
 * @since 1.0.0
 */
export function some<R, E, A>(self: STM<R, E, Option.Option<A>>): STM<R, Option.Option<E>, A> {
  return self.foldSTM(
    (e) => STM.fail(Option.some(e)),
    (option) => {
      switch (option._tag) {
        case "None": {
          return STM.fail(Option.none)
        }
        case "Some": {
          return STM.succeed(option.value)
        }
      }
    }
  )
}
