import { partitionMap } from "@effect/core/io/Effect/operations/_internal/partitionMap"

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a tupled fashion.
 *
 * @tsplus static ets/Effect/Ops partition
 */
export function partition<R, E, A, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, never, Tuple<[Chunk<E>, Chunk<B>]>> {
  return Effect.suspendSucceed(Effect.forEach(as, (a) => f(a).either())).map((chunk) => partitionMap(chunk, identity))
}
