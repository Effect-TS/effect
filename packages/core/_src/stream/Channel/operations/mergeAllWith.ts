import { MergeStrategy } from "@effect/core/stream/Channel/MergeStrategy"

/**
 * @tsplus static effect/core/stream/Channel.Ops mergeAllWith
 */
export function mergeAllWith<
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
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem,
  OutDone
> {
  return Channel.unwrapScoped(
    Effect.withChildren((getChildren) =>
      Do(($) => {
        $(Effect.addFinalizer(getChildren.flatMap(Fiber.interruptAll)))
        const queue = $(Effect.acquireRelease(
          Queue.bounded<Effect<Env, OutErr | OutErr1, Either<OutDone, OutElem>>>(
            bufferSize
          ),
          (queue) => queue.shutdown
        ))
        const cancelers = $(Effect.acquireRelease(
          Queue.unbounded<Deferred<never, void>>(),
          (queue) => queue.shutdown
        ))
        const lastDone = $(Ref.make<Maybe<OutDone>>(Maybe.none))
        const errorSignal = $(Deferred.make<never, void>())
        const permits = $(TSemaphore.makeCommit(n))
        const pull = $(channels.toPull)
        const evaluatePull = (
          pull: Effect<Env | Env1, OutErr | OutErr1, Either<OutDone, OutElem>>
        ) =>
          pull
            .flatMap((either) =>
              either.fold(
                (done) => Effect.sync(Maybe.some(done)),
                (out) => queue.offer(Effect.succeed(Either.right(out))).as(Maybe.none)
              )
            )
            .repeatUntil((option) => option.isSome())
            .flatMap((option) =>
              option.fold(Effect.unit, (outDone) =>
                lastDone.update((_) =>
                  _.fold(Maybe.some(outDone), (lastDone) => Maybe.some(f(lastDone, outDone)))
                ))
            )
            .catchAllCause(
              (cause) =>
                queue.offer(Effect.failCauseSync(cause)).zipRight(
                  errorSignal.succeed(undefined).unit
                )
            )
        $(
          pull
            .foldCauseEffect(
              (cause) =>
                getChildren
                  .flatMap(Fiber.interruptAll)
                  .zipRight(queue.offer(Effect.failCauseSync(cause)).as(false)),
              (either) =>
                either.fold(
                  (outDone) =>
                    errorSignal.await.raceWith(
                      permits.withPermits(n)(Effect.unit),
                      (_, permitAcquisition) =>
                        getChildren
                          .flatMap(Fiber.interruptAll)
                          .zipRight(permitAcquisition.interrupt.as(false)),
                      (_, failureAwait) =>
                        failureAwait.interrupt >
                          lastDone.get.flatMap((option) =>
                            option.fold(
                              queue.offer(Effect.sync(Either.left(outDone))),
                              (lastDone) =>
                                queue.offer(
                                  Effect.sync(Either.left(f(lastDone, outDone)))
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
                                .toPull
                                .flatMap((pull) => evaluatePull(pull).race(errorSignal.await))
                            ))
                          .tap(({ latch, raceIOs }) =>
                            permits
                              .withPermit(latch.succeed(undefined) > raceIOs)
                              .fork
                          )
                          .tap(({ latch }) => latch.await)
                          .bind("errored", () => errorSignal.isDone)
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
                                .toPull
                                .flatMap((pull) =>
                                  evaluatePull(pull)
                                    .race(errorSignal.await)
                                    .race(canceler.await)
                                )
                            ))
                          .tap(({ latch, raceIOs }) =>
                            permits
                              .withPermit(latch.succeed(undefined) > raceIOs)
                              .fork
                          )
                          .tap(({ latch }) => latch.await)
                          .bind("errored", () => errorSignal.isDone)
                          .map(({ errored }) => !errored)
                      }
                    }
                  }
                )
            )
            .repeatWhileEquals(Equivalence.boolean, true)
            .forkScoped
        )
        return queue
      })
    ).map((queue) => {
      const consumer: Channel<
        Env | Env1,
        unknown,
        unknown,
        unknown,
        OutErr | OutErr1,
        OutElem,
        OutDone
      > = Channel.unwrap(
        queue.take.flatten.foldCause(
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
