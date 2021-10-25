// ets_tracing: off

import * as CS from "../../../../Cause"
import * as T from "../../../../Effect"
import * as E from "../../../../Either"
import * as F from "../../../../Fiber"
import { pipe } from "../../../../Function"
import * as M from "../../../../Managed"
import * as P from "../../../../Promise"
import * as Q from "../../../../Queue"
import * as SM from "../../../../Semaphore"
import * as C from "../core"
import * as Managed from "./managed"
import * as ToPull from "./toPull"
import * as Unwrap from "./unwrap"
import * as ZipRight from "./zipRight"

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
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  n: number,
  f: (o: OutElem) => T.Effect<Env1, OutErr1, OutElem1>
): C.Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> {
  return Managed.managed_(
    M.withChildren((getChildren) =>
      pipe(
        M.do,
        M.tap(() => M.finalizer(T.chain_(getChildren, F.interruptAll))),
        M.bind("queue", () =>
          T.toManagedRelease_(
            Q.makeBounded<
              T.Effect<Env1, E.Either<OutErr | OutErr1, OutDone>, OutElem1>
            >(n),
            Q.shutdown
          )
        ),
        M.bind("errorSignal", () => P.makeManaged<OutErr1, never>()),
        M.bind("permits", () => T.toManaged(SM.makeSemaphore(n))),
        M.bind("pull", () => ToPull.toPull(self)),
        M.tap(({ errorSignal, permits, pull, queue }) =>
          pipe(
            pull,
            T.foldCauseM(
              (c) =>
                E.fold_(
                  CS.flipCauseEither(c),
                  (cause) => Q.offer_(queue, T.halt(CS.map_(cause, E.left))),
                  (outDone) =>
                    pipe(
                      SM.withPermits_(T.unit, permits, n),
                      T.interruptible,
                      T.zipRight(Q.offer_(queue, T.fail(E.right(outDone))))
                    )
                ),
              (outElem) =>
                pipe(
                  T.do,
                  T.bind("p", () => P.make<OutErr1, OutElem1>()),
                  T.bind("latch", () => P.make<never, void>()),
                  T.tap(({ p }) => Q.offer_(queue, T.mapError_(P.await(p), E.left))),
                  T.tap(({ latch, p }) =>
                    T.fork(
                      SM.withPermit_(
                        pipe(
                          P.succeed_(latch, void 0),
                          T.zipRight(
                            pipe(
                              T.raceFirst_(P.await(errorSignal), f(outElem)),
                              T.tapCause((_) => P.halt_(errorSignal, _)),
                              T.to(p)
                            )
                          )
                        ),
                        permits
                      )
                    )
                  ),
                  T.tap(({ latch }) => P.await(latch)),
                  T.asUnit
                )
            ),
            T.forever,
            T.interruptible,
            T.forkManaged
          )
        ),
        M.map(({ queue }) => queue)
      )
    ),
    (queue) => {
      const consumer: C.Channel<
        Env1,
        unknown,
        unknown,
        unknown,
        OutErr | OutErr1,
        OutElem1,
        OutDone
      > = Unwrap.unwrap(
        pipe(
          Q.take(queue),
          T.flatten,
          T.foldCause(
            (c) =>
              E.fold_(
                CS.flipCauseEither(c),
                (cause) => C.failCause(cause),
                (outDone) => C.end(outDone)
              ),
            (outElem) => ZipRight.zipRight_(C.write(outElem), consumer)
          )
        )
      )

      return consumer
    }
  )
}

/**
 * @ets_data_first mapOutEffectPar_
 */
export function mapOutEffectPar<Env1, OutErr1, OutElem, OutElem1>(
  n: number,
  f: (o: OutElem) => T.Effect<Env1, OutErr1, OutElem1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapOutEffectPar_(self, n, f)
}
