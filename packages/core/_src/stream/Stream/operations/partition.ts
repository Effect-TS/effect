/**
 * Partition a stream using a predicate. The first stream will contain all
 * element evaluated to true and the second one will contain all element
 * evaluated to false. The faster stream may advance by up to buffer elements
 * further than the slower one.
 *
 * @tsplus fluent ets/Stream partition
 */
export function partition_<R, E, A>(
  self: Stream<R, E, A>,
  p: Predicate<A>,
  buffer = 16,
  __tsplusTrace?: string
): Effect<R & Has<Scope>, E, Tuple<[Stream<unknown, E, A>, Stream<unknown, E, A>]>> {
  return self.partitionEither(
    (a) => p(a) ? Effect.succeedNow(Either.left(a)) : Effect.succeedNow(Either.right(a)),
    buffer
  );
}

/**
 * Partition a stream using a predicate. The first stream will contain all
 * element evaluated to true and the second one will contain all element
 * evaluated to false. The faster stream may advance by up to buffer elements
 * further than the slower one.
 *
 * @tsplus static ets/Stream/Aspects partition
 */
export const partition = Pipeable(partition_);
