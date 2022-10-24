import type { UniqueKey } from "@effect/core/stream/GroupBy/definition"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"

const distributedWithDynamicId = MutableRef.make(0)

/**
 * More powerful version of `Stream.distributedWith`. This returns a function
 * that will produce new queues and corresponding indices. You can also provide
 * a function that will be executed after the final events are enqueued in all
 * queues. Shutdown of the queues is handled by the driver. Downstream users can
 * also shutdown queues manually. In this case the driver will continue but no
 * longer backpressure on them.
 *
 * @tsplus static effect/core/stream/Stream.Aspects distributedWithDynamic
 * @tsplus pipeable effect/core/stream/Stream distributedWithDynamic
 * @category mutations
 * @since 1.0.0
 */
export function distributedWithDynamic<A, E, Z>(
  maximumLag: number,
  decide: (a: A) => Effect<never, never, (key: UniqueKey) => boolean>,
  done: (exit: Exit<Option.Option<E>, never>) => Effect<never, never, Z> = () =>
    Effect.unit as Effect<never, never, Z>
) {
  return <R>(
    self: Stream<R, E, A>
  ): Effect<
    R | Scope,
    never,
    Effect<never, never, readonly [UniqueKey, Dequeue<Exit<Option.Option<E>, A>>]>
  > =>
    Do(($) => {
      const queuesRef = $(Effect.acquireRelease(
        Ref.make<Map<UniqueKey, Queue<Exit<Option.Option<E>, A>>>>(new Map()),
        (map) => map.get.flatMap((queues) => Effect.forEach(queues, ([, queue]) => queue.shutdown))
      ))
      const add = $(
        Do(($) => {
          const queuesLock = $(TSemaphore.makeCommit(1))
          const newQueue = $(
            Ref.make<Effect<never, never, readonly [UniqueKey, Queue<Exit<Option.Option<E>, A>>]>>(
              Do(($) => {
                const queue = $(Queue.bounded<Exit<Option.Option<E>, A>>(maximumLag))
                const id = $(Effect.sync(() => {
                  const value = MutableRef.get(distributedWithDynamicId) + 1
                  pipe(distributedWithDynamicId, MutableRef.set(value))
                  return value
                }))
                $(queuesRef.update((map) => map.set(id, queue)))
                return [id, queue] as const
              })
            )
          )
          const finalize = (endTake: Exit<Option.Option<E>, never>) =>
            // Make sure that no queues are currently being added
            queuesLock.withPermit(
              Do(($) => {
                // All newly created queues should end immediately
                $(
                  newQueue.set(
                    Do(($) => {
                      const queue = $(Queue.bounded<Exit<Option.Option<E>, A>>(1))
                      $(queue.offer(endTake))
                      const id = $(Effect.sync(() => {
                        const value = MutableRef.get(distributedWithDynamicId) + 1
                        pipe(distributedWithDynamicId, MutableRef.set(value))
                        return value
                      }))
                      $(queuesRef.update((map) => map.set(id, queue)))
                      return [id, queue] as const
                    })
                  )
                )
                const queues = $(queuesRef.get.map((map) => map.values()))
                $(Effect.forEach(queues, (queue) =>
                  queue.offer(endTake).catchSomeCause((cause) =>
                    cause.isInterrupted ? Option.some(Effect.unit) : Option.none
                  )))
                $(done(endTake))
              }).unit
            )
          $(
            self.runForEachScoped((a) => offer(queuesRef, decide, a))
              .foldCauseEffect(
                (cause) => finalize(Exit.failCause(cause.map(Option.some))),
                () => finalize(Exit.fail(Option.none))
              ).forkScoped
          )
          return queuesLock.withPermit(newQueue.get.flatten)
        })
      )
      return add
    })
}

function offer<E, A>(
  ref: Ref<Map<UniqueKey, Queue<Exit<Option.Option<E>, A>>>>,
  decide: (a: A) => Effect<never, never, (key: UniqueKey) => boolean>,
  a: A
): Effect<never, E, void> {
  return Do(($) => {
    const shouldProcess = $(decide(a))
    const queues = $(ref.get)
    $(
      Effect.reduce(
        queues,
        List.empty<UniqueKey>(),
        (acc: List.List<UniqueKey>, [id, queue]) =>
          shouldProcess(id)
            ? queue.offer(Exit.succeed(a)).foldCauseEffect(
              (cause) =>
                // Ignore all downstream queues that were shut down and remove
                // them later
                cause.isInterrupted
                  ? Effect.succeed(pipe(acc, List.prepend(id)))
                  : Effect.failCause(cause),
              () => Effect.succeed(acc)
            )
            : Effect.succeed(acc)
      ).flatMap((ids) =>
        List.isNil(ids) ? Effect.unit : ref.update((map) => {
          for (const id of ids) {
            map.delete(id)
          }
          return map
        })
      )
    )
  }).unit
}
