import type { Either } from "@fp-ts/data/Either"

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 *
 * @tsplus static effect/core/stm/STM.Aspects leftOrFail
 * @tsplus pipeable effect/core/stm/STM leftOrFail
 * @category getters
 * @since 1.0.0
 */
export function leftOrFail<C, E1>(orFail: (c: C) => E1) {
  return <R, E, B>(self: STM<R, E, Either<B, C>>): STM<R, E | E1, B> =>
    self.flatMap((either) => {
      switch (either._tag) {
        case "Left": {
          return STM.succeed(either.left)
        }
        case "Right": {
          return STM.failSync(orFail(either.right))
        }
      }
    })
}
