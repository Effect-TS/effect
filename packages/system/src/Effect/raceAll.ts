// ets_tracing: off

import { reduce, reduce_ } from "../Collections/Immutable/Chunk/api/reduce.js"
import type { Chunk as Chunk_1 } from "../Collections/Immutable/Chunk/index.js"
import type { NonEmptyArray } from "../Collections/Immutable/NonEmptyArray/index.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as Exit from "../Exit/index.js"
import * as Fiber from "../Fiber/index.js"
import { pipe } from "../Function/index.js"
import { await as promiseAwait } from "../Promise/await.js"
import { halt } from "../Promise/halt.js"
import type { Promise } from "../Promise/index.js"
import { make } from "../Promise/make.js"
import { succeed } from "../Promise/succeed.js"
import * as Ref from "../Ref/index.js"
import * as as from "./as.js"
import * as asUnit from "./asUnit.js"
import * as core from "./core.js"
import * as Do from "./do.js"
import type { Effect, UIO } from "./effect.js"
import { forEach_ } from "./excl-forEach.js"
import { flatten } from "./flatten.js"
import * as interruption from "./interruption.js"
import * as map from "./map.js"
import * as tap from "./tap.js"

function arbiter<E, A>(
  fibers: Chunk_1<Fiber.Fiber<E, A>>,
  winner: Fiber.Fiber<E, A>,
  promise: Promise<E, Tp.Tuple<[A, Fiber.Fiber<E, A>]>>,
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
                  c === 0 ? pipe(promise, halt(e), asUnit.asUnit) : core.unit,
                  c - 1
                )
              )
            )
          ),
        (a) =>
          pipe(
            promise,
            succeed(Tp.tuple(a, winner)),
            core.chain((set) =>
              set
                ? pipe(
                    fibers,
                    reduce(core.unit as UIO<void>, (io, f) =>
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
    Do.bind("done", () => make<E, Tp.Tuple<[A, Fiber.Fiber<E, A>]>>()),
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
              reduce_(fs, core.unit as UIO<void>, (io, f) =>
                pipe(
                  io,
                  core.chain(() =>
                    pipe(f.await, core.chain(arbiter(fs, f, done, fails)), core.fork)
                  )
                )
              )
            ),
            Do.let(
              "inheritRefs",
              () => (res: Tp.Tuple<[A, Fiber.Fiber<E, A>]>) =>
                pipe(res.get(1).inheritRefs, as.as(res.get(0)))
            ),
            Do.bind("c", ({ fs, inheritRefs }) =>
              pipe(
                restore(pipe(done, promiseAwait, core.chain(inheritRefs))),
                interruption.onInterrupt(() =>
                  reduce_(fs, core.unit as UIO<void>, (io, f) =>
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
