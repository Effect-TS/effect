import type { Option } from "@fp-ts/data/Option"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus static effect/core/stm/STM.Aspects refineOrDieWith
 * @tsplus pipeable effect/core/stm/STM refineOrDieWith
 * @category mutations
 * @since 1.0.0
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => Option<E1>,
  f: (e: E) => unknown
) {
  return <R, A>(self: STM<R, E, A>): STM<R, E1, A> =>
    self.catchAll((e) => {
      const option = pf(e)
      switch (option._tag) {
        case "None": {
          return STM.dieSync(f(e))
        }
        case "Some": {
          return STM.fail(option.value)
        }
      }
    })
}
