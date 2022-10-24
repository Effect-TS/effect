import type { UniqueKey } from "@effect/core/stream/GroupBy/definition"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import type { Option } from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * More powerful version of `Stream.broadcast`. Allows to provide a function
 * that determines what queues should receive which elements. The decide
 * function will receive the indices of the queues in the resulting list.
 *
 * @tsplus static effect/core/stream/Stream.Aspects distributedWith
 * @tsplus pipeable effect/core/stream/Stream distributedWith
 * @category mutations
 * @since 1.0.0
 */
export function distributedWith<A>(
  n: number,
  maximumLag: number,
  decide: (a: A) => Effect<never, never, Predicate<number>>
) {
  return <R, E>(
    self: Stream<R, E, A>
  ): Effect<R | Scope, never, List.List<Dequeue<Exit<Option<E>, A>>>> =>
    Deferred.make<never, (a: A) => Effect<never, never, Predicate<UniqueKey>>>().flatMap((
      deferred
    ) =>
      self.distributedWithDynamic(
        maximumLag,
        (a) => deferred.await.flatMap((f) => f(a)),
        () => Effect.unit
      ).flatMap((next) =>
        Effect.collectAll(
          pipe(
            Chunk.range(0, n - 1),
            Chunk.map((id) => next.map(([key, queue]) => [[key, id] as const, queue] as const))
          )
        ).flatMap((entries) => {
          const [mappings, queues] = pipe(
            entries,
            Chunk.reduceRight(
              [
                new Map<UniqueKey, number>(),
                List.empty<Dequeue<Exit<Option<E>, A>>>()
              ] as const,
              ([mapping, queue], [mappings, queues]) =>
                [mappings.set(mapping[0], mapping[1]), pipe(queues, List.prepend(queue))] as const
            )
          )
          return deferred.succeed(
            (a: A) => decide(a).map((f) => (key: UniqueKey) => f(mappings.get(key)!))
          ).as(queues)
        })
      )
    )
}
