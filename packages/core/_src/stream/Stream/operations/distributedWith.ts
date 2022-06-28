import type { UniqueKey } from "@effect/core/stream/GroupBy/definition"

/**
 * More powerful version of `Stream.broadcast`. Allows to provide a function
 * that determines what queues should receive which elements. The decide
 * function will receive the indices of the queues in the resulting list.
 *
 * @tsplus static effect/core/stream/Stream.Aspects distributedWith
 * @tsplus pipeable effect/core/stream/Stream distributedWith
 */
export function distributedWith<A>(
  n: number,
  maximumLag: number,
  decide: (a: A) => Effect<never, never, Predicate<number>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | Scope, never, List<Dequeue<Exit<Maybe<E>, A>>>> =>
    Deferred.make<never, (a: A) => Effect<never, never, Predicate<UniqueKey>>>().flatMap((deferred) =>
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
                List.empty<Dequeue<Exit<Maybe<E>, A>>>()
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
