import * as Option from "@fp-ts/data/Option"

/**
 * Unwraps the optional success of this effect, but can fail with an None value.
 *
 * @tsplus getter effect/core/stm/STM get
 * @category getters
 * @since 1.0.0
 */
export function get<R, E, A>(self: STM<R, E, Option.Option<A>>): STM<R, Option.Option<E>, A> {
  return self.foldSTM(
    (x) => STM.fail(Option.some(x)),
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
