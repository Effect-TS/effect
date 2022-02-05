// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import * as F from "../../../../Fiber/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as O from "../../../../Option/index.js"
import * as P from "../../../../Promise/index.js"
import * as Q from "../../../../Queue/index.js"
import * as Ref from "../../../../Ref/index.js"
import * as SM from "../../../../Semaphore/index.js"
import * as C from "../core.js"
import * as Managed from "./managed.js"
import * as ToPull from "./toPull.js"
import * as Unwrap from "./unwrap.js"
import * as ZipRight from "./zipRight.js"

export type MergeStrategy = "BackPressure" | "BufferSliding"

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
  channels: C.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
    OutDone
  >,
  n: number,
  f: (o1: OutDone, o2: OutDone) => OutDone,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = "BackPressure"
): C.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem,
  OutDone
> {
  return Managed.managed_(
    M.withChildren((getChildren) =>
      pipe(
        M.do,
        M.tap(() => M.finalizer(T.chain_(getChildren, F.interruptAll))),
        M.bind("queue", () =>
          T.toManagedRelease_(
            Q.makeBounded<T.Effect<Env, OutErr | OutErr1, E.Either<OutDone, OutElem>>>(
              bufferSize
            ),
            Q.shutdown
          )
        ),
        M.bind("cancelers", () =>
          T.toManagedRelease_(Q.makeUnbounded<P.Promise<never, void>>(), Q.shutdown)
        ),
        M.bind("lastDone", () => Ref.makeManagedRef<O.Option<OutDone>>(O.none)),
        M.bind("errorSignal", () => P.makeManaged<never, void>()),
        M.bind("permits", () => T.toManaged(SM.makeSemaphore(n))),
        M.bind("pull", () => ToPull.toPull(channels)),
        M.let(
          "evaluatePull",
          ({ errorSignal, lastDone, queue }) =>
            (
              pull: T.Effect<Env & Env1, OutErr | OutErr1, E.Either<OutDone, OutElem>>
            ) =>
              pipe(
                pull,
                T.chain(
                  E.fold(
                    (done) => T.succeed(O.some(done)),
                    (outElem) =>
                      T.as_(Q.offer_(queue, T.succeed(E.right(outElem))), O.none)
                  )
                ),
                T.repeatUntil(O.isSome),
                T.chain(
                  O.fold(
                    () => T.unit,
                    (outDone) =>
                      Ref.update_(
                        lastDone,
                        O.fold(
                          () => O.some(outDone),
                          (lastDone) => O.some(f(lastDone, outDone))
                        )
                      )
                  )
                ),
                T.catchAllCause((cause) =>
                  T.zipRight_(
                    Q.offer_(queue, T.halt(cause)),
                    T.asUnit(P.succeed_(errorSignal, undefined))
                  )
                )
              )
        ),
        M.tap(
          ({ cancelers, errorSignal, evaluatePull, lastDone, permits, pull, queue }) =>
            pipe(
              pull,
              T.foldCauseM(
                (cause) =>
                  T.zipRight_(
                    T.chain_(getChildren, F.interruptAll),
                    T.as_(Q.offer_(queue, T.halt(cause)), false)
                  ),
                E.fold(
                  (outDone) =>
                    T.raceWith_(
                      P.await(errorSignal),
                      SM.withPermits_(T.unit, permits, n),
                      (_, permitAcquisition) =>
                        T.zipRight_(
                          T.chain_(getChildren, F.interruptAll),
                          T.as_(F.interrupt(permitAcquisition), false)
                        ),
                      (_, failureAwait) =>
                        T.zipRight_(
                          F.interrupt(failureAwait),
                          T.as_(
                            T.chain_(
                              lastDone.get,
                              O.fold(
                                () => Q.offer_(queue, T.succeed(E.left(outDone))),
                                (lastDone) =>
                                  Q.offer_(
                                    queue,
                                    T.succeed(E.left(f(lastDone, outDone)))
                                  )
                              )
                            ),
                            false
                          )
                        )
                    ),
                  (channel) => {
                    if (mergeStrategy === "BackPressure") {
                      return pipe(
                        T.do,
                        T.bind("latch", () => P.make<never, void>()),
                        T.let("raceIOs", () =>
                          M.use_(ToPull.toPull(channel), (_) =>
                            T.race_(evaluatePull(_), P.await(errorSignal))
                          )
                        ),
                        T.tap(({ latch, raceIOs }) =>
                          T.fork(
                            SM.withPermit_(
                              T.zipRight_(P.succeed_(latch, undefined), raceIOs),
                              permits
                            )
                          )
                        ),
                        T.tap(({ latch }) => P.await(latch)),
                        T.bind("errored", () => P.isDone(errorSignal)),
                        T.map(({ errored }) => !errored)
                      )
                    } else {
                      return pipe(
                        T.do,
                        T.bind("canceler", () => P.make<never, void>()),
                        T.bind("latch", () => P.make<never, void>()),
                        T.bind("size", () => Q.size(cancelers)),
                        T.tap(({ size }) =>
                          T.when_(
                            T.chain_(Q.take(cancelers), (_) =>
                              P.succeed_(_, undefined)
                            ),
                            () => size >= n
                          )
                        ),
                        T.tap(({ canceler }) => Q.offer_(cancelers, canceler)),
                        T.let("raceIOs", ({ canceler }) =>
                          M.use_(ToPull.toPull(channel), (_) =>
                            T.race_(
                              T.race_(evaluatePull(_), P.await(errorSignal)),
                              P.await(canceler)
                            )
                          )
                        ),
                        T.tap(({ latch, raceIOs }) =>
                          T.fork(
                            SM.withPermit_(
                              T.zipRight_(P.succeed_(latch, undefined), raceIOs),
                              permits
                            )
                          )
                        ),
                        T.tap(({ latch }) => P.await(latch)),
                        T.bind("errored", () => P.isDone(errorSignal)),
                        T.map(({ errored }) => !errored)
                      )
                    }
                  }
                )
              ),
              T.repeatWhile((x) => x === true),
              T.forkManaged
            )
        ),
        M.map(({ queue }) => queue)
      )
    ),
    (queue) => {
      const consumer: C.Channel<
        Env & Env1,
        unknown,
        unknown,
        unknown,
        OutErr | OutErr1,
        OutElem,
        OutDone
      > = Unwrap.unwrap(
        pipe(
          Q.take(queue),
          T.flatten,
          T.foldCause(
            (cause) => C.failCause(cause),
            E.fold(
              (outDone) => C.end(outDone),
              (outElem) => ZipRight.zipRight_(C.write(outElem), consumer)
            )
          )
        )
      )

      return consumer
    }
  )
}

/**
 * @ets_data_first mergeAllWith_
 */
export function mergeAllWith<OutDone>(
  n: number,
  f: (o1: OutDone, o2: OutDone) => OutDone,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = "BackPressure"
) {
  return <
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
    OutElem
  >(
    channels: C.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
      OutDone
    >
  ) => mergeAllWith_(channels, n, f, bufferSize, mergeStrategy)
}
