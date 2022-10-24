import * as Either from "@fp-ts/data/Either"

/**
 * Returns a stream whose failures and successes have been lifted into an
 * `Either`. The resulting stream cannot fail, because the failures have been
 * exposed as part of the `Either` success case.
 *
 * @note The stream will end as soon as the first error occurs.
 *
 * @tsplus getter effect/core/stream/Stream either
 * @category mutations
 * @since 1.0.0
 */
export function either<R, E, A>(self: Stream<R, E, A>): Stream<R, never, Either.Either<E, A>> {
  return self.map(Either.right).catchAll((e) => Stream(Either.left(e)))
}
