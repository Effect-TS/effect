import * as A from "../Array"
import * as Exit from "../Exit"
import * as Fiber from "../Fiber"
import { flow, pipe, tuple } from "../Function"
import type { NonEmptyArray } from "../NonEmptyArray"
import * as P from "../Promise"
import * as Ref from "../Ref"
import { as } from "./as"
import { asUnit } from "./asUnit"
import { chain, fork, unit } from "./core"
import * as Do from "./do"
import type { Effect, UIO } from "./effect"
import { flatten } from "./flatten"
import { foreach_ } from "./foreach_"
import { interruptible } from "./interruptible"
import { map } from "./map"
import { onInterrupt } from "./onInterrupt"
import { tap } from "./tap"
import { tap_ } from "./tap_"
import { uninterruptibleMask } from "./uninterruptibleMask"

function arbiter<E, A>(
  fibers: readonly Fiber.Fiber<E, A>[],
  winner: Fiber.Fiber<E, A>,
  promise: P.Promise<E, readonly [A, Fiber.Fiber<E, A>]>,
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
                tuple(c === 0 ? pipe(promise, P.halt(e), asUnit) : unit, c - 1)
              )
            )
          ),
        (a) =>
          pipe(
            promise,
            P.succeed(tuple(a, winner)),
            chain((set) =>
              set
                ? pipe(
                    fibers,
                    A.reduce(unit as UIO<void>, (io, f) =>
                      f === winner ? io : tap_(io, () => Fiber.interrupt(f))
                    )
                  )
                : unit
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
export function raceAll<R, E, A>(
  ios: NonEmptyArray<Effect<R, E, A>>,
  interruptStrategy: "background" | "wait" = "background"
): Effect<R, E, A> {
  return pipe(
    Do.do,
    Do.bind("done", () => P.make<E, readonly [A, Fiber.Fiber<E, A>]>()),
    Do.bind("fails", () => Ref.makeRef(ios.length)),
    Do.bind("c", ({ done, fails }) =>
      uninterruptibleMask(({ restore }) =>
        pipe(
          Do.do,
          Do.bind("fs", () => foreach_(ios, flow(interruptible, fork))),
          tap(({ fs }) =>
            A.reduce_(fs, unit as UIO<void>, (io, f) =>
              pipe(
                io,
                chain(() => pipe(f.await, chain(arbiter(fs, f, done, fails)), fork))
              )
            )
          ),
          Do.let("inheritRefs", () => (res: readonly [A, Fiber.Fiber<E, A>]) =>
            pipe(res[1].inheritRefs, as(res[0]))
          ),
          Do.bind("c", ({ fs, inheritRefs }) =>
            pipe(
              restore(pipe(done, P.await, chain(inheritRefs))),
              onInterrupt(() =>
                A.reduce_(fs, unit as UIO<void>, (io, f) =>
                  tap_(io, () => Fiber.interrupt(f))
                )
              )
            )
          ),
          map(({ c, fs }) => ({ c, fs }))
        )
      )
    ),
    tap(({ c: { fs } }) =>
      interruptStrategy === "wait" ? foreach_(fs, (f) => f.await) : unit
    ),
    map(({ c: { c } }) => c)
  )
}
