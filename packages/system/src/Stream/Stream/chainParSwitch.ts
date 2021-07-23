// ets_tracing: off

import type * as C from "../../Cause"
import type * as A from "../../Collections/Immutable/Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as P from "../../Promise"
import * as Q from "../../Queue"
import * as SM from "../../Semaphore"
import * as Pull from "../../Stream/Pull"
import * as T from "../_internal/effect"
import * as F from "../_internal/fiber"
import * as M from "../_internal/managed"
import * as chain from "./chain"
import { Stream } from "./definitions"
import * as forEach from "./forEach"
import { managed } from "./managed"
import * as tap from "./tap"

/**
 * Maps each element of this stream to another stream and returns the non-deterministic merge
 * of those streams, executing up to `n` inner streams concurrently. When a new stream is created
 * from an element of the source stream, the oldest executing stream is cancelled. Up to `bufferSize`
 * elements of the produced streams may be buffered in memory by this operator.
 */
export function chainParSwitch(n: number, bufferSize = 16) {
  return <R1, E1, O, O2>(f: (o: O) => Stream<R1, E1, O2>) =>
    <R, E>(self: Stream<R, E, O>): Stream<R & R1, E | E1, O2> => {
      return new Stream(
        M.withChildren((getChildren) =>
          pipe(
            M.do,
            M.bind("out", () =>
              T.toManagedRelease_(
                Q.makeBounded<T.Effect<R1, O.Option<E | E1>, A.Chunk<O2>>>(bufferSize),
                Q.shutdown
              )
            ),
            M.bind("permits", () => T.toManaged(SM.makeSemaphore(n))),
            M.bind("innerFailure", () => T.toManaged(P.make<C.Cause<E1>, never>())),
            M.bind("cancelers", () =>
              T.toManagedRelease_(Q.makeBounded<P.Promise<never, void>>(n), Q.shutdown)
            ),
            M.tap(({ cancelers, innerFailure, out, permits }) =>
              pipe(
                forEach.forEachManaged_(self, (a) =>
                  pipe(
                    T.do,
                    T.bind("canceler", () => P.make<never, void>()),
                    T.bind("latch", () => P.make<never, void>()),
                    T.bind("size", () => Q.size(cancelers)),
                    T.tap(({ size }) => {
                      if (size < n) {
                        return T.unit
                      } else {
                        return pipe(
                          Q.take(cancelers),
                          T.chain((_) => T.succeed(undefined)),
                          T.asUnit
                        )
                      }
                    }),
                    T.tap(({ canceler }) => Q.offer_(cancelers, canceler)),
                    T.let("innerStream", ({ latch }) =>
                      pipe(
                        managed(SM.withPermitManaged(permits)),
                        tap.tap((_) => P.succeed_(latch, undefined)),
                        chain.chain((_) => f(a)),
                        forEach.forEachChunk((o2s) =>
                          T.asUnit(Q.offer_(out, T.succeed(o2s)))
                        ),
                        T.foldCauseM(
                          (cause) =>
                            pipe(
                              Q.offer_(out, Pull.halt(cause)),
                              T.zipRight(P.fail_(innerFailure, cause)),
                              T.asUnit
                            ),
                          (_) => T.unit
                        )
                      )
                    ),
                    T.tap(({ canceler, innerStream }) =>
                      T.fork(T.race_(innerStream, P.await(canceler)))
                    ),
                    T.tap(({ latch }) => P.await(latch)),
                    T.asUnit
                  )
                ),
                M.foldCauseM(
                  (cause) =>
                    pipe(
                      pipe(
                        getChildren,
                        T.chain((_) => F.interruptAll(_)),
                        T.zipRight(Q.offer_(out, Pull.halt(cause)))
                      ),
                      T.asUnit,
                      T.toManaged
                    ),
                  (_) =>
                    pipe(
                      P.await(innerFailure),
                      T.raceWith(
                        SM.withPermits_(T.unit, permits, n),
                        (_, permitAcquisition) =>
                          pipe(
                            getChildren,
                            T.chain(F.interruptAll),
                            T.zipRight(T.asUnit(F.interrupt(permitAcquisition)))
                          ),
                        (_, failureAwait) =>
                          pipe(
                            Q.offer_(out, Pull.end),
                            T.zipRight(T.asUnit(F.interrupt(failureAwait)))
                          )
                      ),
                      T.toManaged
                    )
                ),
                M.fork
              )
            ),
            M.map(({ out }) => T.flatten(Q.take(out)))
          )
        )
      )
    }
}
