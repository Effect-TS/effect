import * as Option from "@fp-ts/data/Option"

/**
 * Requires the option produced by this value to be `None`.
 *
 * @tsplus getter effect/core/stm/STM noneOrFail
 * @category getters
 * @since 1.0.0
 */
export function noneOrFail<R, E, A, B>(
  self: STM<R, E, Option.Option<A>>
): STM<R, Option.Option<E>, void> {
  return self.foldSTM(
    (e) => STM.fail(Option.some(e)),
    (option) => {
      switch (option._tag) {
        case "None": {
          return STM.unit
        }
        case "Some": {
          return STM.fail(Option.none)
        }
      }
    }
  )
}
