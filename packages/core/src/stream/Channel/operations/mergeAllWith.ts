import { Either } from "../../../data/Either"
import { identity } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import { Fiber } from "../../../io/Fiber"
import { Managed } from "../../../io/Managed"
import { Promise } from "../../../io/Promise"
import { Queue } from "../../../io/Queue"
import { Ref } from "../../../io/Ref"
import { Semaphore } from "../../../io/Semaphore"
import { Channel } from "../definition"
import { MergeStrategy } from "../MergeStrategy"

/**
 * @tsplus static ets/ChannelOps mergeAllWith
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
  return Channel.managed(
    Managed.withChildren((getChildren) =>
      Managed.Do()
        .tap(() =>
          Managed.finalizer(getChildren.flatMap((chunk) => Fiber.interruptAll(chunk)))
        )
        .bind("queue", () =>
          Queue.bounded<Effect<Env, OutErr | OutErr1, Either<OutDone, OutElem>>>(
            bufferSize
          ).toManagedWith((queue) => queue.shutdown())
        )
        .bind("cancelers", () =>
          Queue.unbounded<Promise<never, void>>().toManagedWith((queue) =>
            queue.shutdown()
          )
        )
        .bind("lastDone", () => Ref.makeManaged<Option<OutDone>>(Option.none))
        .bind("errorSignal", () => Promise.makeManaged<never, void>())
        .bind("permits", () => Semaphore.make(n).toManaged())
        .bind("pull", () => channels.toPull())
        .bindValue(
          "evaluatePull",
          ({ errorSignal, lastDone, queue }) =>
            (pull: Effect<Env & Env1, OutErr | OutErr1, Either<OutDone, OutElem>>) =>
              pull
                .flatMap((either) =>
                  either.fold(
                    (done) => Effect.succeed(Option.some(done)),
                    (out) =>
                      queue.offer(Effect.succeedNow(Either.right(out))).as(Option.none)
                  )
                )
                .repeatUntil((option: Option<OutDone>) => option.isSome())
                .flatMap((option: Option<OutDone>) =>
                  option.fold(Effect.unit, (outDone) =>
                    lastDone.update((_) =>
                      _.fold(Option.some(outDone), (lastDone) =>
                        Option.some(f(lastDone, outDone))
                      )
                    )
                  )
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
                        Effect.unit.apply(permits.withPermits(n)),
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
                            .bind("latch", () => Promise.make<never, void>())
                            .bindValue("raceIOs", () =>
                              channel
                                .toPull()
                                .use((pull) =>
                                  evaluatePull(pull).race(errorSignal.await())
                                )
                            )
                            .tap(({ latch, raceIOs }) =>
                              (latch.succeed(undefined) > raceIOs)
                                .apply(permits.withPermit)
                                .fork()
                            )
                            .tap(({ latch }) => latch.await())
                            .bind("errored", () => errorSignal.isDone())
                            .map(({ errored }) => !errored)
                        }
                        case "BufferSliding": {
                          return Effect.Do()
                            .bind("canceler", () => Promise.make<never, void>())
                            .bind("latch", () => Promise.make<never, void>())
                            .bind("size", () => cancelers.size)
                            .tap(({ size }) =>
                              Effect.when(
                                size >= n,
                                cancelers
                                  .take()
                                  .flatMap((promise) => promise.succeed(undefined))
                              )
                            )
                            .tap(({ canceler }) => cancelers.offer(canceler))
                            .bindValue("raceIOs", ({ canceler }) =>
                              channel
                                .toPull()
                                .use((pull) =>
                                  evaluatePull(pull)
                                    .race(errorSignal.await())
                                    .race(canceler.await())
                                )
                            )
                            .tap(({ latch, raceIOs }) =>
                              (latch.succeed(undefined) > raceIOs)
                                .apply(permits.withPermit)
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
              .repeatWhile(identity)
              .forkManaged()
        )
        .map(({ queue }) => queue)
    ),
    (queue) => {
      const consumer: Channel<
        Env & Env1,
        unknown,
        unknown,
        unknown,
        OutErr | OutErr1,
        OutElem,
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

export const mergeAllWith = Pipeable(mergeAllWith_)
