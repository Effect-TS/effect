import type { Either } from "@fp-ts/data/Either"

/**
 * @tsplus static effect/core/io/Exit.Ops fromEither
 * @category conversions
 * @since 1.0.0
 */
export function fromEither<E, A>(e: Either<E, A>): Exit<E, A> {
  switch (e._tag) {
    case "Left":
      return Exit.fail(e.left)
    case "Right":
      return Exit.succeed(e.right)
  }
}
