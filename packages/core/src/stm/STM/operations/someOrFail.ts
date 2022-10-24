import type { Option } from "@fp-ts/data/Option"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus static effect/core/stm/STM.Aspects someOrFail
 * @tsplus pipeable effect/core/stm/STM someOrFail
 * @category getters
 * @since 1.0.0
 */
export function someOrFail<E2>(orFail: LazyArg<E2>) {
  return <R, E, A>(self: STM<R, E, Option<A>>): STM<R, E | E2, A> =>
    self.flatMap((option) => {
      switch (option._tag) {
        case "None": {
          return STM.sync(orFail).flatMap(STM.fail)
        }
        case "Some": {
          return STM.succeed(option.value)
        }
      }
    })
}
