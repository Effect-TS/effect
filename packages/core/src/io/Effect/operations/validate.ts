import * as Chunk from "@fp-ts/data/Chunk"
import * as List from "@fp-ts/data/List"

/**
 * Sequentially zips the this result with the specified result. Combines both
 * `Cause<E1>` when both effects fail.
 *
 * @tsplus static effect/core/io/Effect.Aspects validate
 * @tsplus pipeable effect/core/io/Effect validate
 * @category validation
 * @since 1.0.0
 */
export function validateNow<R1, E1, B>(that: Effect<R1, E1, B>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R1, E | E1, readonly [A, B]> =>
    self.validateWith(that, (a, b) => [a, b] as const)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost. To retain all information please use `partition`.
 *
 * @tsplus static effect/core/io/Effect.Ops validate
 * @category validation
 * @since 1.0.0
 */
export function validate<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, Chunk.Chunk<E>, Chunk.Chunk<B>> {
  return Effect.partition(as, f).flatMap(([es, bs]) =>
    List.isNil(es)
      ? Effect.succeed(Chunk.fromIterable(bs))
      : Effect.fail(Chunk.fromIterable(es))
  )
}
