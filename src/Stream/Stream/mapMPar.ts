import { pipe } from "../../Function"
import * as Option from "../../Option"
import * as P from "../../Promise"
import { makeBounded } from "../../Queue"
import * as Semaphore from "../../Semaphore"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Pull from "../Pull"
import { Stream } from "./definitions"
import { foreachManaged } from "./foreachManaged"

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 */
export const mapMPar = (n: number) => <O, R1, E1, O1>(
  f: (o: O) => T.Effect<R1, E1, O1>
) => <R, E>(self: Stream<R, E, O>): Stream<R & R1, E | E1, O1> =>
  new Stream(
    pipe(
      M.do,
      M.bind("out", () =>
        M.fromEffect(makeBounded<T.Effect<R1, Option.Option<E1 | E>, O1>>(n))
      ),
      M.bind("errorSignal", () => M.fromEffect(P.make<E1, never>())),
      M.bind("permits", () => M.fromEffect(Semaphore.makeSemaphore(n))),
      M.tap(({ errorSignal, out, permits }) =>
        pipe(
          self,
          foreachManaged((a) =>
            pipe(
              T.do,
              T.bind("p", () => P.make<E1, O1>()),
              T.bind("latch", () => P.make<never, void>()),
              T.tap(({ p }) => out.offer(pipe(p, P.await, T.mapError(Option.some)))),
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
                  Semaphore.withPermit(permits),
                  T.fork
                )
              ),
              T.tap(({ latch }) => P.await(latch)),
              T.asUnit
            )
          ),
          M.foldCauseM(
            (c) => M.fromEffect(out.offer(Pull.halt(c))),
            () =>
              pipe(
                Semaphore.withPermits(n)(permits)(T.unit),
                T.chain(() => out.offer(Pull.end)),
                M.fromEffect
              )
          ),
          M.fork
        )
      ),
      M.map(({ out }) =>
        pipe(
          out.take,
          T.flatten,
          T.map((o) => [o])
        )
      )
    )
  )
