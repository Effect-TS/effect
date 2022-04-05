import { partitionMap } from "@effect-ts/core/io/Effect/operations/_internal/partitionMap";

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a tupled fashion.
 *
 * @tsplus static ets/STM/Ops partition
 */
export function partition<R, E, A, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => STM<R, E, B>
): STM<R, never, Tuple<[Chunk<E>, Chunk<B>]>> {
  return STM.suspend(STM.forEach(as, (a) => f(a).either())).map((chunk) => partitionMap(chunk, identity));
}
