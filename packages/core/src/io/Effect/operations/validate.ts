import { Chunk } from "../../../collection/immutable/Chunk"
import type { NonEmptyArray } from "../../../collection/immutable/NonEmptyArray"
import * as NA from "../../../collection/immutable/NonEmptyArray"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Sequentially zips the this result with the specified result. Combines both
 * `Cause<E1>` when both effects fail.
 *
 * @tsplus fluent ets/Effect validate
 */
export function validateNow_<R, E, A, R1, E1, B>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R1, E1, B>>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, Tuple<[A, B]>> {
  return self.validateWith(that, (a, b) => Tuple(a, b))
}

/**
 * Sequentially zips the this result with the specified result. Combines both
 * `Cause<E1>` when both effects fail.
 *
 * @ets_data_first validateNow_
 */
export function validateNow<R1, E1, B>(
  that: LazyArg<Effect<R1, E1, B>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R1, E | E1, Tuple<[A, B]>> =>
    self.validate(that)
}

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost. To retain all information please use `partition`.
 *
 * @tsplus static ets/EffectOps validate
 */
export function validate<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, NonEmptyArray<E>, Chunk<B>> {
  return Effect.partition(as, f).flatMap(({ tuple: [es, bs] }) =>
    es.isEmpty()
      ? Effect.succeedNow(Chunk.from(bs))
      : Effect.fail(NA.prepend_(es.tail().toArray(), es.unsafeFirst()!))
  )
}
