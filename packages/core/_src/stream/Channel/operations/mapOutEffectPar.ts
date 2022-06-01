/**
 * @tsplus fluent ets/Channel mapOutEffectPar
 */
export function mapOutEffectPar_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  n: number,
  f: (o: OutElem) => Effect<Env1, OutErr1, OutElem1>
): Channel<Env | Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> {
  return Channel.unwrapScoped(
    Effect.withChildren((getChildren) =>
      Effect.Do()
        .tap(() =>
          Effect.addFinalizer(
            getChildren.flatMap((fibers) => Fiber.interruptAll(fibers))
          )
        )
        .bind("queue", () =>
          Effect.acquireRelease(
            Queue.bounded<Effect<Env1, OutErr | OutErr1, Either<OutDone, OutElem1>>>(n),
            (queue) => queue.shutdown
          ))
        .bind("errorSignal", () => Deferred.make<OutErr1, never>())
        .bind("permits", () => Semaphore.make(n))
        .bind("pull", () => self.toPull())
        .tap(({ errorSignal, permits, pull, queue }) =>
          pull
            .foldCauseEffect(
              (cause) => queue.offer(Effect.failCause(cause)),
              (either) =>
                either.fold(
                  (outDone) =>
                    Effect.unit.apply(permits.withPermits(n)).interruptible() >
                      queue.offer(Effect.succeed(Either.left(outDone))),
                  (outElem) =>
                    Effect.Do()
                      .bind("deferred", () => Deferred.make<OutErr1, OutElem1>())
                      .bind("latch", () => Deferred.make<never, void>())
                      .tap(({ deferred }) => queue.offer(deferred.await().map(Either.right)))
                      .tap(({ deferred, latch }) =>
                        permits
                          .withPermit(
                            latch.succeed(undefined) >
                              errorSignal
                                .await()
                                .raceFirst(f(outElem))
                                .tapErrorCause((cause) => errorSignal.failCause(cause))
                                .intoDeferred(deferred)
                          )
                          .fork()
                      )
                      .tap(({ latch }) => latch.await())
                )
            )
            .forever()
            .interruptible()
            .forkScoped()
        )
        .map(({ queue }) => queue)
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
 * @tsplus static ets/Channel/Aspects mapOutEffectPar
 */
export const mapOutEffectPar = Pipeable(mapOutEffectPar_)
