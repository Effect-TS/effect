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
 * @tsplus static effect/core/stream/Stream.Aspects distributedWithDynamic
 * @tsplus pipeable effect/core/stream/Stream distributedWithDynamic
 */
export function distributedWithDynamic<A, E, Z>(
  maximumLag: number,
  decide: (a: A) => Effect<never, never, (key: UniqueKey) => boolean>,
  done: (exit: Exit<Maybe<E>, never>) => Effect<never, never, Z> = () =>
    Effect.unit as Effect<never, never, Z>
) {
  return <R>(
    self: Stream<R, E, A>
  ): Effect<
    R | Scope,
    never,
    Effect<never, never, Tuple<[UniqueKey, Dequeue<Exit<Maybe<E>, A>>]>>
  > =>
    Do(($) => {
      const queuesRef = $(Effect.acquireRelease(
        Ref.make<HashMap<UniqueKey, Queue<Exit<Maybe<E>, A>>>>(HashMap.empty()),
        (map) =>
          map
            .get
            .flatMap((queues) => Effect.forEach(queues, ({ tuple: [, queue] }) => queue.shutdown))
      ))
      const add = $(
        Do(($) => {
          const queuesLock = $(TSemaphore.makeCommit(1))
          const newQueue = $(
            Ref.make<Effect<never, never, Tuple<[UniqueKey, Queue<Exit<Maybe<E>, A>>]>>>(
              Effect.Do()
                .bind("queue", () => Queue.bounded<Exit<Maybe<E>, A>>(maximumLag))
                .bind("id", () => Effect.sync(distributedWithDynamicId.incrementAndGet()))
                .tap(({ id, queue }) => queuesRef.update((map) => map.set(id, queue)))
                .map(({ id, queue }) => Tuple(id, queue))
            )
          )
          const finalize = (endTake: Exit<Maybe<E>, never>) =>
            // Make sure that no queues are currently being added
            queuesLock.withPermit(
              Effect.Do()
                .tap(() =>
                  // All newly created queues should end immediately
                  newQueue.set(
                    Effect.Do()
                      .bind("queue", () => Queue.bounded<Exit<Maybe<E>, A>>(1))
                      .tap(({ queue }) => queue.offer(endTake))
                      .bind("id", () => Effect.sync(distributedWithDynamicId.incrementAndGet()))
                      .tap(({ id, queue }) => queuesRef.update((map) => map.set(id, queue)))
                      .map(({ id, queue }) => Tuple(id, queue))
                  )
                )
                .bind("queues", () => queuesRef.get.map((map) => map.values))
                .tap(({ queues }) =>
                  Effect.forEach(queues, (queue) =>
                    queue
                      .offer(endTake)
                      .catchSomeCause((cause) =>
                        cause.isInterrupted ? Maybe.some(Effect.unit) : Maybe.none
                      ))
                )
                .tap(() => done(endTake))
                .unit
            )
          $(
            self
              .runForEachScoped((a) => offer(queuesRef, decide, a))
              .foldCauseEffect(
                (cause) => finalize(Exit.failCause(cause.map(Maybe.some))),
                () => finalize(Exit.fail(Maybe.none))
              )
              .forkScoped
          )
          return queuesLock.withPermit(newQueue.get.flatten)
        })
      )
      return add
    })
}

function offer<E, A>(
  ref: Ref<HashMap<UniqueKey, Queue<Exit<Maybe<E>, A>>>>,
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
        (acc: List<UniqueKey>, { tuple: [id, queue] }) =>
          shouldProcess(id)
            ? queue.offer(Exit.succeed(a)).foldCauseEffect(
              (cause) =>
                // Ignore all downstream queues that were shut down and remove
                // them later
                cause.isInterrupted
                  ? Effect.succeed(acc.prepend(id))
                  : Effect.failCause(cause),
              () => Effect.succeed(acc)
            )
            : Effect.succeed(acc)
      ).flatMap((ids) => ids.isNil() ? Effect.unit : ref.update((map) => map.removeMany(ids)))
    )
  }).unit
}
