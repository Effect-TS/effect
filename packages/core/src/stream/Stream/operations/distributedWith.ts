import { Chunk } from "../../../collection/immutable/Chunk"
import { HashMap } from "../../../collection/immutable/HashMap"
import { List } from "../../../collection/immutable/List"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { Predicate } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { UIO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import type { Managed } from "../../../io/Managed"
import { Promise } from "../../../io/Promise"
import type { Dequeue } from "../../../io/Queue"
import type { UniqueKey } from "../../GroupBy"
import type { Stream } from "../definition"

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
  decide: (a: A) => UIO<Predicate<number>>,
  __tsplusTrace?: string
): Managed<R, never, List<Dequeue<Exit<Option<E>, A>>>> {
  return Promise.make<never, (a: A) => UIO<Predicate<UniqueKey>>>()
    .toManaged()
    .flatMap((promise) =>
      self
        .distributedWithDynamic(
          maximumLag,
          (a) => promise.await().flatMap((f) => f(a)),
          () => Effect.unit
        )
        .flatMap((next) =>
          Effect.collectAll(
            Chunk.range(0, n - 1).map((id) =>
              next.map(({ tuple: [key, queue] }) => Tuple(Tuple(key, id), queue))
            )
          )
            .flatMap((entries) => {
              const {
                tuple: [mappings, queues]
              } = entries.reduceRight(
                Tuple(
                  HashMap.empty<UniqueKey, number>(),
                  List.empty<Dequeue<Exit<Option<E>, A>>>()
                ),
                ({ tuple: [mapping, queue] }, { tuple: [mappings, queues] }) =>
                  Tuple(
                    mappings.set(mapping.get(0), mapping.get(1)),
                    queues.prepend(queue)
                  )
              )
              return promise
                .succeed(
                  () => (a: A) =>
                    decide(a).map((f) => (key: UniqueKey) => f(mappings.unsafeGet(key)))
                )
                .as(queues)
            })
            .toManaged()
        )
    )
}

/**
 * More powerful version of `Stream.broadcast`. Allows to provide a function
 * that determines what queues should receive which elements. The decide
 * function will receive the indices of the queues in the resulting list.
 */
export const distributedWith = Pipeable(distributedWith_)
