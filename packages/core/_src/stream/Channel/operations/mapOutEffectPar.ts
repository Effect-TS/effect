/**
 * @tsplus static effect/core/stream/Channel.Aspects mapOutEffectPar
 * @tsplus pipeable effect/core/stream/Channel mapOutEffectPar
 */
export function mapOutEffectPar<OutElem, Env1, OutErr1, OutElem1>(
  n: number,
  f: (o: OutElem) => Effect<Env1, OutErr1, OutElem1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env | Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> =>
    Channel.unwrapScoped(
      Effect.withChildren((getChildren) =>
        Do(($) => {
          $(Effect.addFinalizer(
            getChildren.flatMap((fibers) => Fiber.interruptAll(fibers))
          ))
          const queue = $(Effect.acquireRelease(
            Queue.bounded<Effect<Env1, OutErr | OutErr1, Either<OutDone, OutElem1>>>(n),
            (queue) => queue.shutdown
          ))
          const errorSignal = $(Deferred.make<OutErr1, never>())
          const permits = $(TSemaphore.makeCommit(n))
          const pull = $(self.toPull)
          $(
            pull
              .foldCauseEffect(
                (cause) => queue.offer(Effect.failCause(cause)),
                (either) =>
                  either.fold(
                    (outDone) =>
                      Effect.unit.apply(permits.withPermits(n)).interruptible >
                        queue.offer(Effect.sync(Either.left(outDone))),
                    (outElem) =>
                      Do(($) => {
                        const deferred = $(Deferred.make<OutErr1, OutElem1>())
                        const latch = $(Deferred.make<never, void>())
                        $(queue.offer(deferred.await.map(Either.right)))
                        $(
                          permits
                            .withPermit(
                              latch.succeed(undefined) >
                                errorSignal
                                  .await
                                  .raceFirst(f(outElem))
                                  .tapErrorCause((cause) => errorSignal.failCause(cause))
                                  .intoDeferred(deferred)
                            )
                            .fork
                        )
                        $(latch.await)
                      })
                  )
              )
              .forever
              .interruptible
              .forkScoped
          )
          return queue
        })
      ).map((queue) => {
        const consumer: Channel<
          Env1,
          unknown,
          unknown,
          unknown,
          OutErr | OutErr1,
          OutElem1,
          OutDone
        > = Channel.unwrap(
          queue.take.flatten.foldCause(
            (cause) => Channel.failCause(cause),
            (either) =>
              either.fold(
                (outDone) => Channel.succeed(outDone),
                (outElem) => Channel.write(outElem) > consumer
              )
          )
        )
        return consumer
      })
    )
}
