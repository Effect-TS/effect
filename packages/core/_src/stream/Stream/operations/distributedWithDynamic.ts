import type { UniqueKey } from "@effect/core/stream/GroupBy/definition"

const distributedWithDynamicId = new AtomicNumber(0)

/**
 * More powerful version of `Stream.distributedWith`. This returns a function
 * that will produce new queues and corresponding indices. You can also provide
 * a function that will be executed after the final events are enqueued in all
 * queues. Shutdown of the queues is handled by the driver. Downstream users can
 * also shutdown queues manually. In this case the driver will continue but no
 * longer backpressure on them.
 *
 * @tsplus fluent ets/Stream distributedWithDynamic
 */
export function distributedWithDynamic_<R, E, A, Z>(
  self: Stream<R, E, A>,
  maximumLag: number,
  decide: (a: A) => Effect.UIO<(key: UniqueKey) => boolean>,
  done: (exit: Exit<Option<E>, never>) => Effect.UIO<Z> = () => Effect.unit as Effect.UIO<Z>,
  __tsplusTrace?: string
): Effect<R | Scope, never, Effect.UIO<Tuple<[UniqueKey, Dequeue<Exit<Option<E>, A>>]>>> {
  return Effect.Do()
    .bind("queuesRef", () =>
      Effect.acquireRelease(
        Ref.make<HashMap<UniqueKey, Queue<Exit<Option<E>, A>>>>(HashMap.empty()),
        (map) =>
          map
            .get()
            .flatMap((queues) => Effect.forEach(queues, ({ tuple: [, queue] }) => queue.shutdown))
      ))
    .bind("add", ({ queuesRef }) =>
      Effect.Do()
        .bind("queuesLock", () => Semaphore.make(1))
        .bind("newQueue", () =>
          Ref.make<Effect.UIO<Tuple<[UniqueKey, Queue<Exit<Option<E>, A>>]>>>(
            Effect.Do()
              .bind("queue", () => Queue.bounded<Exit<Option<E>, A>>(maximumLag))
              .bind("id", () => Effect.succeed(distributedWithDynamicId.incrementAndGet()))
              .tap(({ id, queue }) => queuesRef.update((map) => map.set(id, queue)))
              .map(({ id, queue }) => Tuple(id, queue))
          ))
        .bindValue(
          "finalize",
          ({ newQueue, queuesLock }) =>
            (endTake: Exit<Option<E>, never>) =>
              // Make sure that no queues are currently being added
              queuesLock.withPermit(
                Effect.Do()
                  .tap(() =>
                    // All newly created queues should end immediately
                    newQueue.set(
                      Effect.Do()
                        .bind("queue", () => Queue.bounded<Exit<Option<E>, A>>(1))
                        .tap(({ queue }) => queue.offer(endTake))
                        .bind("id", () => Effect.succeed(distributedWithDynamicId.incrementAndGet()))
                        .tap(({ id, queue }) => queuesRef.update((map) => map.set(id, queue)))
                        .map(({ id, queue }) => Tuple(id, queue))
                    )
                  )
                  .bind("queues", () => queuesRef.get().map((map) => map.values()))
                  .tap(({ queues }) =>
                    Effect.forEach(queues, (queue) =>
                      queue
                        .offer(endTake)
                        .catchSomeCause((cause) => cause.isInterrupted() ? Option.some(Effect.unit) : Option.none))
                  )
                  .tap(() => done(endTake))
                  .asUnit()
              )
        )
        .tap(({ finalize }) =>
          self
            .runForEachScoped((a) => offer(queuesRef, decide, a))
            .foldCauseEffect(
              (cause) => finalize(Exit.failCause(cause.map(Option.some))),
              () => finalize(Exit.fail(Option.none))
            )
            .fork()
        )
        .map(({ newQueue, queuesLock }) => queuesLock.withPermit(newQueue.get().flatten())))
    .map(({ add }) => add)
}

/**
 * More powerful version of `Stream.distributedWith`. This returns a function
 * that will produce new queues and corresponding indices. You can also provide
 * a function that will be executed after the final events are enqueued in all
 * queues. Shutdown of the queues is handled by the driver. Downstream users can
 * also shutdown queues manually. In this case the driver will continue but no
 * longer backpressure on them.
 */
export const distributedWithDynamic = Pipeable(distributedWithDynamic_)

function offer<E, A>(
  ref: Ref<HashMap<UniqueKey, Queue<Exit<Option<E>, A>>>>,
  decide: (a: A) => Effect.UIO<(key: UniqueKey) => boolean>,
  a: A,
  __tsplusTrace?: string
): Effect<never, E, void> {
  return Effect.Do()
    .bind("shouldProcess", () => decide(a))
    .bind("queues", () => ref.get())
    .tap(({ queues, shouldProcess }) =>
      Effect.reduce(queues, List.empty<UniqueKey>(), (acc: List<UniqueKey>, { tuple: [id, queue] }) =>
        shouldProcess(id)
          ? queue.offer(Exit.succeed(a)).foldCauseEffect(
            (cause) =>
              // Ignore all downstream queues that were shut down and remove
              // them later
              cause.isInterrupted()
                ? Effect.succeedNow(acc.prepend(id))
                : Effect.failCause(cause),
            () => Effect.succeedNow(acc)
          )
          : Effect.succeedNow(acc)).flatMap((ids) =>
          ids.isNil() ? Effect.unit : ref.update((map) => map.removeMany(ids)))
    )
}
