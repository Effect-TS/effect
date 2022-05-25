import { MergeStrategy } from "@effect/core/stream/Channel/MergeStrategy"

/**
 * @tsplus static ets/Channel/Ops mergeAllWith
 */
export function mergeAllWith_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutDone
>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
    OutDone
  >,
  n: number,
  f: (o1: OutDone, o2: OutDone) => OutDone,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = MergeStrategy.BackPressure
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem,
  OutDone
> {
  return Channel.unwrapScoped(
    Effect.withChildren((getChildren) =>
      Effect.Do()
        .tap(() => Effect.addFinalizer(getChildren.flatMap((chunk) => Fiber.interruptAll(chunk))))
        .bind("queue", () =>
          Effect.acquireRelease(
            Queue.bounded<Effect<Env, OutErr | OutErr1, Either<OutDone, OutElem>>>(
              bufferSize
            ),
            (queue) => queue.shutdown
          ))
        .bind("cancelers", () =>
          Effect.acquireRelease(
            Queue.unbounded<Deferred<never, void>>(),
            (queue) => queue.shutdown
          ))
        .bind("lastDone", () => Ref.make<Option<OutDone>>(Option.none))
        .bind("errorSignal", () => Deferred.make<never, void>())
        .bind("permits", () => Semaphore.make(n))
        .bind("pull", () => channels.toPull())
        .bindValue(
          "evaluatePull",
          ({ errorSignal, lastDone, queue }) =>
            (pull: Effect<Env & Env1, OutErr | OutErr1, Either<OutDone, OutElem>>) =>
              pull
                .flatMap((either) =>
                  either.fold(
                    (done) => Effect.succeed(Option.some(done)),
                    (out) => queue.offer(Effect.succeedNow(Either.right(out))).as(Option.none)
                  )
                )
                .repeatUntil((option) => option.isSome())
                .flatMap((option) =>
                  option.fold(Effect.unit, (outDone) =>
                    lastDone.update((_) =>
                      _.fold(Option.some(outDone), (lastDone) => Option.some(f(lastDone, outDone)))
                    ))
                )
                .catchAllCause(
                  (cause) =>
                    queue.offer(Effect.failCause(cause)) >
                      errorSignal.succeed(undefined).asUnit()
                )
        )
        .tap(
          ({ cancelers, errorSignal, evaluatePull, lastDone, permits, pull, queue }) =>
            pull
              .foldCauseEffect(
                (cause) =>
                  getChildren.flatMap((fibers) => Fiber.interruptAll(fibers)) >
                    queue.offer(Effect.failCause(cause)).as(false),
                (either) =>
                  either.fold(
                    (outDone) =>
                      errorSignal.await().raceWith(
                        permits.withPermits(n)(Effect.unit),
                        (_, permitAcquisition) =>
                          getChildren.flatMap((fibers) => Fiber.interruptAll(fibers)) >
                            permitAcquisition.interrupt().as(false),
                        (_, failureAwait) =>
                          failureAwait.interrupt() >
                            lastDone
                              .get()
                              .flatMap((option) =>
                                option.fold(
                                  queue.offer(Effect.succeed(Either.left(outDone))),
                                  (lastDone) =>
                                    queue.offer(
                                      Effect.succeed(Either.left(f(lastDone, outDone)))
                                    )
                                )
                              )
                      ),
                    (channel) => {
                      switch (mergeStrategy._tag) {
                        case "BackPressure": {
                          return Effect.Do()
                            .bind("latch", () => Deferred.make<never, void>())
                            .bindValue("raceIOs", () =>
                              Effect.scoped(
                                channel
                                  .toPull()
                                  .flatMap((pull) => evaluatePull(pull).race(errorSignal.await()))
                              ))
                            .tap(({ latch, raceIOs }) =>
                              permits
                                .withPermit(latch.succeed(undefined) > raceIOs)
                                .fork()
                            )
                            .tap(({ latch }) => latch.await())
                            .bind("errored", () => errorSignal.isDone())
                            .map(({ errored }) => !errored)
                        }
                        case "BufferSliding": {
                          return Effect.Do()
                            .bind("canceler", () => Deferred.make<never, void>())
                            .bind("latch", () => Deferred.make<never, void>())
                            .bind("size", () => cancelers.size)
                            .tap(({ size }) =>
                              Effect.when(
                                size >= n,
                                cancelers.take.flatMap((deferred) => deferred.succeed(undefined))
                              )
                            )
                            .tap(({ canceler }) => cancelers.offer(canceler))
                            .bindValue("raceIOs", ({ canceler }) =>
                              Effect.scoped(
                                channel
                                  .toPull()
                                  .flatMap((pull) =>
                                    evaluatePull(pull)
                                      .race(errorSignal.await())
                                      .race(canceler.await())
                                  )
                              ))
                            .tap(({ latch, raceIOs }) =>
                              permits
                                .withPermit(latch.succeed(undefined) > raceIOs)
                                .fork()
                            )
                            .tap(({ latch }) => latch.await())
                            .bind("errored", () => errorSignal.isDone())
                            .map(({ errored }) => !errored)
                        }
                      }
                    }
                  )
              )
              .repeatWhileEquals(Equivalence.boolean)(true)
              .forkScoped()
        )
        .map(({ queue }) => queue)
    ).map((queue) => {
      const consumer: Channel<
        Env & Env1,
        unknown,
        unknown,
        unknown,
        OutErr | OutErr1,
        OutElem,
        OutDone
      > = Channel.unwrap(
        queue.take.flatten().foldCause(
          (cause) => Channel.failCause(cause),
          (either) =>
            either.fold(
              (outDone) => Channel.succeedNow(outDone),
              (outElem) => Channel.write(outElem) > consumer
            )
        )
      )

      return consumer
    })
  )
}

/**
 * @tsplus static ets/Channel/Aspects mergeAllWith
 */
export const mergeAllWith = Pipeable(mergeAllWith_)
