import * as Chunk from "@fp-ts/data/Chunk"
import * as List from "@fp-ts/data/List"

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost. To retain all information please use `partition`.
 *
 * @tsplus static effect/core/stm/STM.Ops validate
 * @category validation
 * @since 1.0.0
 */
export function validate<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => STM<R, E, B>
): STM<R, Chunk.Chunk<E>, Chunk.Chunk<B>> {
  return STM.partition(as, f).flatMap(([es, bs]) =>
    List.isNil(es)
      ? STM.succeed(Chunk.fromIterable(bs))
      : STM.fail(Chunk.fromIterable(es))
  )
}
