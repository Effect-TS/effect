import * as Either from "@fp-ts/data/Either"

/**
 * Returns an effect with the value on the right part.
 *
 * @tsplus static effect/core/stm/STM.Ops right
 * @category constructors
 * @since 1.0.0
 */
export function succeedRight<A>(value: A): USTM<Either.Either<never, A>> {
  return STM.succeed(Either.right(value))
}
