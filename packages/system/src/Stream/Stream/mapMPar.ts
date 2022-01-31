// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as P from "../../Promise/index.js"
import * as Q from "../../Queue/index.js"
import * as SM from "../../Semaphore/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"
import { forEachManaged } from "./forEach.js"
/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 */
export function mapMPar(n: number) {
  return <O, R1, E1, O1>(f: (o: O) => T.Effect<R1, E1, O1>) =>
    <R, E>(self: Stream<R, E, O>): Stream<R & R1, E | E1, O1> =>
      new Stream(
        pipe(
          M.do,
          M.bind("out", () =>
            M.fromEffect(Q.makeBounded<T.Effect<R1, O.Option<E1 | E>, O1>>(n))
          ),
          M.bind("errorSignal", () => M.fromEffect(P.make<E1, never>())),
          M.bind("permits", () => M.fromEffect(SM.makeSemaphore(n))),
          M.tap(({ errorSignal, out, permits }) =>
            pipe(
              self,
              forEachManaged((a) =>
                pipe(
                  T.do,
                  T.bind("p", () => P.make<E1, O1>()),
                  T.bind("latch", () => P.make<never, void>()),
                  T.tap(({ p }) => Q.offer_(out, pipe(p, P.await, T.mapError(O.some)))),
                  T.tap(({ latch, p }) =>
                    pipe(
                      latch,
                      // Make sure we start evaluation before moving on to the next element
                      P.succeed<void>(undefined),
                      T.chain(() =>
                        pipe(
                          errorSignal,
                          P.await,
                          // Interrupt evaluation if another task fails
                          T.raceFirst(f(a)),
                          // Notify other tasks of a failure
                          T.tapCause((e) => pipe(errorSignal, P.halt(e))),
                          // Transfer the result to the consuming stream
                          T.to(p)
                        )
                      ),
                      SM.withPermit(permits),
                      T.fork
                    )
                  ),
                  T.tap(({ latch }) => P.await(latch)),
                  T.asUnit
                )
              ),
              M.foldCauseM(
                (c) => M.fromEffect(Q.offer_(out, Pull.halt(c))),
                () =>
                  pipe(
                    SM.withPermits_(T.unit, permits, n),
                    T.chain(() => Q.offer_(out, Pull.end)),
                    M.fromEffect
                  )
              ),
              M.fork
            )
          ),
          M.map(({ out }) =>
            pipe(
              Q.take(out),
              T.flatten,
              T.map((o) => A.single(o))
            )
          )
        )
      )
}
