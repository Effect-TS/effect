// tracing: off

import * as Chunk from "../Collections/Immutable/Chunk"
import type { NonEmptyArray } from "../Collections/Immutable/NonEmptyArray"
import * as Tp from "../Collections/Immutable/Tuple"
import * as Exit from "../Exit"
import * as Fiber from "../Fiber"
import { pipe } from "../Function"
import * as P from "../Promise"
import * as Ref from "../Ref"
import * as as from "./as"
import * as asUnit from "./asUnit"
import * as core from "./core"
import * as Do from "./do"
import type { Effect, UIO } from "./effect"
import { forEach_ } from "./excl-forEach"
import { flatten } from "./flatten"
import * as interruption from "./interruption"
import * as map from "./map"
import * as tap from "./tap"

function arbiter<E, A>(
  fibers: Chunk.Chunk<Fiber.Fiber<E, A>>,
  winner: Fiber.Fiber<E, A>,
  promise: P.Promise<E, Tp.Tuple<[A, Fiber.Fiber<E, A>]>>,
  fails: Ref.Ref<number>
) {
  return (res: Exit.Exit<E, A>): UIO<void> =>
    pipe(
      res,
      Exit.foldM(
        (e) =>
          flatten(
            pipe(
              fails,
              Ref.modify((c) =>
                Tp.tuple(
                  c === 0 ? pipe(promise, P.halt(e), asUnit.asUnit) : core.unit,
                  c - 1
                )
              )
            )
          ),
        (a) =>
          pipe(
            promise,
            P.succeed(Tp.tuple(a, winner)),
            core.chain((set) =>
              set
                ? pipe(
                    fibers,
                    Chunk.reduce(core.unit as UIO<void>, (io, f) =>
                      f === winner ? io : tap.tap_(io, () => Fiber.interrupt(f))
                    )
                  )
                : core.unit
            )
          )
      )
    )
}

/**
 * Returns an effect that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value.
 * Losers of the race will be interrupted immediately.
 *
 * Note: in case of success eventual interruption errors are ignored
 */
export function raceAllWithStrategy<R, E, A>(
  ios: NonEmptyArray<Effect<R, E, A>>,
  interruptStrategy: "background" | "wait",
  __trace?: string
): Effect<R, E, A> {
  return pipe(
    Do.do,
    Do.bind("done", () => P.make<E, Tp.Tuple<[A, Fiber.Fiber<E, A>]>>()),
    Do.bind("fails", () => Ref.makeRef(ios.length)),
    Do.bind("c", ({ done, fails }) =>
      interruption.uninterruptibleMask(
        ({ restore }) =>
          pipe(
            Do.do,
            Do.bind("fs", () =>
              forEach_(ios, (x) => pipe(x, interruption.interruptible, core.fork))
            ),
            tap.tap(({ fs }) =>
              Chunk.reduce_(fs, core.unit as UIO<void>, (io, f) =>
                pipe(
                  io,
                  core.chain(() =>
                    pipe(f.await, core.chain(arbiter(fs, f, done, fails)), core.fork)
                  )
                )
              )
            ),
            Do.let("inheritRefs", () => (res: Tp.Tuple<[A, Fiber.Fiber<E, A>]>) =>
              pipe(res.get(1).inheritRefs, as.as(res.get(0)))
            ),
            Do.bind("c", ({ fs, inheritRefs }) =>
              pipe(
                restore(pipe(done, P.await, core.chain(inheritRefs))),
                interruption.onInterrupt(() =>
                  Chunk.reduce_(fs, core.unit as UIO<void>, (io, f) =>
                    tap.tap_(io, () => Fiber.interrupt(f))
                  )
                )
              )
            ),
            map.map(({ c, fs }) => ({ c, fs }))
          ),
        __trace
      )
    ),
    tap.tap(({ c: { fs } }) =>
      interruptStrategy === "wait" ? forEach_(fs, (f) => f.await) : core.unit
    ),
    map.map(({ c: { c } }) => c)
  )
}

/**
 * Returns an effect that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value.
 * Losers of the race will be interrupted immediately.
 *
 * Note: in case of success eventual interruption errors are ignored
 */
export function raceAll<R, E, A>(
  ios: NonEmptyArray<Effect<R, E, A>>,
  __trace?: string
): Effect<R, E, A> {
  return raceAllWithStrategy(ios, "background", __trace)
}

/**
 * Returns an effect that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value.
 * Losers of the race will be interrupted immediately.
 *
 * Note: in case of success eventual interruption errors are ignored
 */
export function raceAllWait<R, E, A>(
  ios: NonEmptyArray<Effect<R, E, A>>,
  __trace?: string
): Effect<R, E, A> {
  return raceAllWithStrategy(ios, "wait", __trace)
}
