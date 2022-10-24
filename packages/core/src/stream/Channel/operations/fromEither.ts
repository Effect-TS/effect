import type { Either } from "@fp-ts/data/Either"

/**
 * @tsplus static effect/core/stream/Channel.Ops fromEither
 * @category conversions
 * @since 1.0.0
 */
export function fromEither<E, A>(
  either: Either<E, A>
): Channel<never, unknown, unknown, unknown, E, never, A> {
  return Channel.suspend(() => {
    switch (either._tag) {
      case "Left": {
        return Channel.fail(either.left)
      }
      case "Right": {
        return Channel.succeed(either.right)
      }
    }
  })
}
