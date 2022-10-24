import type { Option } from "@fp-ts/data/Option"

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus static effect/core/stm/STM.Aspects flattenErrorOption
 * @tsplus pipeable effect/core/stm/STM flattenErrorOption
 * @category sequencing
 * @since 1.0.0
 */
export function flattenErrorOption<E2>(def: E2) {
  return <R, E, A>(self: STM<R, Option<E>, A>): STM<R, E | E2, A> =>
    self.mapError((option) => {
      switch (option._tag) {
        case "None": {
          return def
        }
        case "Some": {
          return option.value
        }
      }
    })
}
