import type * as C from "../../Cause"
import type * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as P from "../../Promise"
import * as Q from "../../Queue"
import * as SM from "../../Semaphore"
import * as T from "../_internal/effect"
import * as F from "../_internal/fiber"
import * as M from "../_internal/managed"
import * as Pull from "../Pull"
import { chain } from "./chain"
import { Stream } from "./definitions"
import { foreachChunk } from "./foreachChunk"
import { foreachManaged_ } from "./foreachManaged"
import { managed } from "./managed"
import { tap } from "./tap"

/**
 * Maps each element of this stream to another stream and returns the
 * non-deterministic merge of those streams, executing up to `n` inner streams
 * concurrently. Up to `outputBuffer` elements of the produced streams may be
 * buffered in memory by this operator.
 */
export function chainPar(n: number, outputBuffer = 16) {
  return <R1, E1, O, O2>(f: (o: O) => Stream<R1, E1, O2>) => <R, E>(
    self: Stream<R, E, O>
  ): Stream<R & R1, E | E1, O2> => {
    return new Stream(
      M.withChildren((getChildren) =>
        pipe(
          M.do,
          M.bind("out", () =>
            T.toManaged_(
              Q.makeBounded<T.Effect<R1, O.Option<E | E1>, A.Chunk<O2>>>(outputBuffer),
              (q) => q.shutdown
            )
          ),
          M.bind("permits", () => T.toManaged_(SM.makeSemaphore(n))),
          M.bind("innerFailure", () => T.toManaged_(P.make<C.Cause<E1>, never>())),
          M.tap(({ innerFailure, out, permits }) =>
            pipe(
              foreachManaged_(self, (a) =>
                pipe(
                  T.do,
                  T.bind("latch", () => P.make<never, void>()),
                  T.let("innerStream", ({ latch }) =>
                    pipe(
                      managed(SM.withPermitManaged(permits)),
                      tap((_) => P.succeed_(latch, undefined)),
                      chain((_) => f(a)),
                      foreachChunk((b) => T.asUnit(out.offer(T.succeed(b)))),
                      T.foldCauseM(
                        (cause) =>
                          T.asUnit(
                            T.andThen_(
                              out.offer(Pull.halt(cause)),
                              P.fail_(innerFailure, cause)
                            )
                          ),
                        (_) => T.unit
                      )
                    )
                  ),
                  T.tap(({ innerStream }) => T.fork(innerStream)),
                  T.tap(({ latch }) => P.await(latch)),
                  T.asUnit
                )
              ),
              M.foldCauseM(
                (cause) =>
                  T.toManaged_(
                    T.andThen_(
                      T.chain_(getChildren, (c) => F.interruptAll(c)),
                      T.asUnit(out.offer(Pull.halt(cause)))
                    )
                  ),
                (_) =>
                  pipe(
                    P.await(innerFailure),
                    T.interruptible,
                    T.raceWith(
                      SM.withPermits(n)(permits)(T.interruptible(T.unit)),
                      (_, permitsAcquisition) =>
                        T.andThen_(
                          T.chain_(getChildren, (c) => F.interruptAll(c)),
                          T.asUnit(F.interrupt(permitsAcquisition))
                        ),
                      (_, failureAwait) =>
                        T.andThen_(
                          out.offer(Pull.end),
                          T.asUnit(F.interrupt(failureAwait))
                        )
                    ),
                    T.toManaged()
                  )
              ),
              M.fork
            )
          ),
          M.map(({ out }) => T.flatten(out.take))
        )
      )
    )
  }
}
