import type { UniqueKey } from "@effect/core/stream/GroupBy/definition"

/**
 * More powerful version of `Stream.broadcast`. Allows to provide a function
 * that determines what queues should receive which elements. The decide
 * function will receive the indices of the queues in the resulting list.
 *
 * @tsplus fluent ets/Stream distributedWith
 */
export function distributedWith_<R, E, A>(
  self: Stream<R, E, A>,
  n: number,
  maximumLag: number,
  decide: (a: A) => Effect.UIO<Predicate<number>>,
  __tsplusTrace?: string
): Effect<R | Scope, never, List<Dequeue<Exit<Option<E>, A>>>> {
  return Deferred.make<never, (a: A) => Effect.UIO<Predicate<UniqueKey>>>().flatMap((deferred) =>
    self
      .distributedWithDynamic(
        maximumLag,
        (a) => deferred.await().flatMap((f) => f(a)),
        () => Effect.unit
      )
      .flatMap((next) =>
        Effect.collectAll(
          Chunk.range(0, n - 1).map((id) => next.map(({ tuple: [key, queue] }) => Tuple(Tuple(key, id), queue)))
        ).flatMap((entries) => {
          const {
            tuple: [mappings, queues]
          } = entries.reduceRight(
            Tuple(
              HashMap.empty<UniqueKey, number>(),
              List.empty<Dequeue<Exit<Option<E>, A>>>()
            ),
            ({ tuple: [mapping, queue] }, { tuple: [mappings, queues] }) =>
              Tuple(mappings.set(mapping.get(0), mapping.get(1)), queues.prepend(queue))
          )
          return deferred
            .succeed(
              () => (a: A) => decide(a).map((f) => (key: UniqueKey) => f(mappings.unsafeGet(key)))
            )
            .as(queues)
        })
      )
  )
}

/**
 * More powerful version of `Stream.broadcast`. Allows to provide a function
 * that determines what queues should receive which elements. The decide
 * function will receive the indices of the queues in the resulting list.
 *
 * @tsplus static ets/Stream/Aspects distributedWith
 */
export const distributedWith = Pipeable(distributedWith_)
