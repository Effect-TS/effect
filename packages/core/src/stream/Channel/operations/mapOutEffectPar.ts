import { Either } from "../../../data/Either"
import { Effect } from "../../../io/Effect"
import { Fiber } from "../../../io/Fiber"
import { Managed } from "../../../io/Managed"
import { Promise } from "../../../io/Promise"
import { Queue } from "../../../io/Queue"
import { Semaphore } from "../../../io/Semaphore"
import { Channel } from "../definition"

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
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> {
  return Channel.managed(
    Managed.withChildren((getChildren) =>
      Managed.Do()
        .tap(() =>
          Managed.finalizer(getChildren.flatMap((fibers) => Fiber.interruptAll(fibers)))
        )
        .bind("queue", () =>
          Queue.bounded<Effect<Env1, OutErr | OutErr1, Either<OutDone, OutElem1>>>(
            n
          ).toManagedWith((queue) => queue.shutdown())
        )
        .bind("errorSignal", () => Promise.makeManaged<OutErr1, never>())
        .bind("permits", () => Semaphore.make(n).toManaged())
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
                      .bind("promise", () => Promise.make<OutErr1, OutElem1>())
                      .bind("latch", () => Promise.make<never, void>())
                      .tap(({ promise }) =>
                        queue.offer(promise.await().map(Either.right))
                      )
                      .tap(({ latch, promise }) =>
                        permits
                          .withPermit(
                            latch.succeed(undefined) >
                              errorSignal
                                .await()
                                .raceFirst(f(outElem))
                                .tapErrorCause((cause) => errorSignal.failCause(cause))
                                .intoPromise(promise)
                          )
                          .fork()
                      )
                      .tap(({ latch }) => latch.await())
                )
            )
            .forever()
            .interruptible()
            .forkManaged()
        )
        .map(({ queue }) => queue)
    ),
    (queue) => {
      const consumer: Channel<
        Env1,
        unknown,
        unknown,
        unknown,
        OutErr | OutErr1,
        OutElem1,
        OutDone
      > = Channel.unwrap(
        queue
          .take()
          .flatten()
          .foldCause(
            (cause) => Channel.failCause(cause),
            (either) =>
              either.fold(
                (outDone) => Channel.succeedNow(outDone),
                (outElem) => Channel.write(outElem) > consumer
              )
          )
      )
      return consumer
    }
  )
}

export const mapOutEffectPar = Pipeable(mapOutEffectPar_)
