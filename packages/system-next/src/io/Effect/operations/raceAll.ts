import { reduce_ } from "../../../collection/immutable/Chunk/api/reduce"
import * as Chunk from "../../../collection/immutable/Chunk/core"
import * as Tp from "../../../collection/immutable/Tuple"
import { pipe } from "../../../data/Function"
import * as Ref from "../../../io/Ref"
import * as Exit from "../../Exit"
import * as Fiber from "../../Fiber"
import * as P from "../../Promise"
import type { Effect, UIO } from "../definition"
import { asUnit } from "./asUnit"
import { chain, chain_ } from "./chain"
import * as Do from "./do"
import { forEach_ } from "./excl-forEach"
import { flatten } from "./flatten"
import { fork } from "./fork"
import {
  interruptible,
  onInterrupt_,
  uninterruptible,
  uninterruptibleMask
} from "./interruption"
import { map_ } from "./map"
import { tap } from "./tap"
import { unit } from "./unit"
import { zipLeft_ } from "./zipLeft"

/**
 * Returns an effect that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value. Losers of
 * the race will be interrupted immediately
 *
 * @ets fluent ets/Effect raceAll
 */
export function raceAll_<R, E, A>(
  self: Effect<R, E, A>,
  effects: Iterable<Effect<R, E, A>>,
  __trace?: string
): Effect<R, E, A> {
  const ios = Chunk.from(effects)
  return pipe(
    Do.Do(),
    Do.bind("done", () => P.make<E, Tp.Tuple<[A, Fiber.Fiber<E, A>]>>()),
    Do.bind("fails", () => Ref.make(Chunk.size(ios))),
    chain(({ done, fails }) =>
      uninterruptibleMask(
        ({ restore }) =>
          pipe(
            Do.Do(),
            Do.bind("head", () => fork(uninterruptible(self))),
            Do.bind("tail", () => forEach_(ios, (io) => fork(interruptible(io)))),
            Do.bindValue("fs", ({ head, tail }) => Chunk.prepend_(tail, head)),
            tap(({ fs }) =>
              reduce_(fs, unit, (io, f) =>
                chain_(io, () => chain_(Fiber.await(f), arbiter(fs, f, done, fails)))
              )
            ),
            Do.bindValue(
              "inheritRefs",
              () =>
                (res: Tp.Tuple<[A, Fiber.Fiber<E, A>]>): UIO<A> =>
                  map_(res.get(1).inheritRefs, () => res.get(0))
            ),
            chain(({ fs, inheritRefs }) =>
              onInterrupt_(restore(chain_(P.await(done), inheritRefs)), () =>
                reduce_(fs, unit, (io, f) => zipLeft_(io, Fiber.interrupt(f)))
              )
            )
          ),
        __trace
      )
    )
  )
}

/**
 * Returns an effect that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value. Losers of
 * the race will be interrupted immediately
 *
 * @ets_data_first raceAll_
 */
export function raceAll<R, E, A>(as: Iterable<Effect<R, E, A>>, __trace?: string) {
  return (self: Effect<R, E, A>): Effect<R, E, A> => raceAll_(self, as, __trace)
}

function arbiter<E, A>(
  fibers: Chunk.Chunk<Fiber.Fiber<E, A>>,
  winner: Fiber.Fiber<E, A>,
  promise: P.Promise<E, Tp.Tuple<[A, Fiber.Fiber<E, A>]>>,
  fails: Ref.Ref<number>
) {
  return (exit: Exit.Exit<E, A>): UIO<void> => {
    return Exit.foldEffect_(
      exit,
      (e) =>
        flatten(
          Ref.modify_(fails, (c) =>
            Tp.tuple(c === 0 ? asUnit(P.failCause_(promise, e)) : unit, c - 1)
          )
        ),
      (a) =>
        chain_(P.succeed_(promise, Tp.tuple(a, winner)), (set) =>
          set
            ? reduce_(fibers, unit, (io, f) =>
                f === winner ? io : zipLeft_(io, Fiber.interrupt(f))
              )
            : unit
        )
    )
  }
}
