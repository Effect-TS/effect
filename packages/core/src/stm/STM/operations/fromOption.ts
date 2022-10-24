import * as Option from "@fp-ts/data/Option"

/**
 * Lifts an `Option` into a `STM`.
 *
 * @tsplus static effect/core/stm/STM.Ops fromOption
 * @category conversions
 * @since 1.0.0
 */
export function fromOption<A>(option: Option.Option<A>): STM<never, Option.Option<never>, A> {
  return STM.suspend(() => {
    switch (option._tag) {
      case "None": {
        return STM.fail(Option.none)
      }
      case "Some": {
        return STM.succeed(option.value)
      }
    }
  })
}
