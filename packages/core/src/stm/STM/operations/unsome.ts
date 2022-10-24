import * as Option from "@fp-ts/data/Option"

/**
 * Converts an option on errors into an option on values.
 *
 * @tsplus getter effect/core/stm/STM unsome
 * @category getters
 * @since 1.0.0
 */
export function unsome<R, E, A>(self: STM<R, Option.Option<E>, A>): STM<R, E, Option.Option<A>> {
  return self.foldSTM(
    (option) => {
      switch (option._tag) {
        case "None": {
          return STM.succeed<Option.Option<A>>(Option.none)
        }
        case "Some": {
          return STM.fail(option.value)
        }
      }
    },
    (a) => STM.succeed(Option.some(a))
  )
}
