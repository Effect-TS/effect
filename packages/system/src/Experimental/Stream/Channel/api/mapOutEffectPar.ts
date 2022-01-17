// ets_tracing: off

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
              T.Effect<Env1, OutErr | OutErr1, E.Either<OutDone, OutElem1>>
            >(n),
            Q.shutdown
          )
        ),
        M.bind("errorSignal", () => P.makeManaged<OutErr1, never>()),
        M.bind("permits", () => T.toManaged(SM.make(n))),
        M.bind("pull", () => ToPull.toPull(self)),
        M.tap(({ errorSignal, permits, pull, queue }) =>
          pipe(
            pull,
            T.foldCauseM(
              (cause) => Q.offer_(queue, T.halt(cause)),
              E.fold(
                (outDone) =>
                  T.asUnit(
                    T.zipRight_(
                      T.interruptible(SM.withPermits_(T.unit, permits, n)),
                      Q.offer_(queue, T.succeed(E.left(outDone)))
                    )
                  ),
                (outElem) =>
                  pipe(
                    T.do,
                    T.bind("p", () => P.make<OutErr1, OutElem1>()),
                    T.bind("latch", () => P.make<never, void>()),
                    T.tap(({ p }) => Q.offer_(queue, T.map_(P.await(p), E.right))),
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
            (_) => C.failCause(_),
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
