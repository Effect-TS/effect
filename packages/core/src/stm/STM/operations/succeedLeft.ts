import * as Either from "@fp-ts/data/Either"

/**
 * Returns an effect with the value on the left part.
 *
 * @tsplus static effect/core/stm/STM.Ops left
 * @category constructors
 * @since 1.0.0
 */
export function succeedLeft<A>(value: A): USTM<Either.Either<A, never>> {
  return STM.succeed(Either.left(value))
}
