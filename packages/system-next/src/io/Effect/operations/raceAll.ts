import { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import * as Ref from "../../../io/Ref"
import type { Exit } from "../../Exit"
import * as Fiber from "../../Fiber"
import { Promise } from "../../Promise"
import { Effect } from "../definition"

/**
 * Returns an effect that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value. Losers of
 * the race will be interrupted immediately
 *
 * @tsplus fluent ets/Effect raceAll
 */
export function raceAll_<R, E, A>(
  self: Effect<R, E, A>,
  effects: Iterable<Effect<R, E, A>>,
  __etsTrace?: string
): Effect<R, E, A> {
  const ios = Chunk.from(effects)
  return Effect.Do()
    .bind("done", () => Promise.make<E, Tuple<[A, Fiber.Fiber<E, A>]>>())
    .bind("fails", () => Ref.make(ios.size))
    .flatMap(({ done, fails }) =>
      Effect.uninterruptibleMask(({ restore }) =>
        Effect.Do()
          .bind("head", () => self.uninterruptible().fork())
          .bind("tail", () => Effect.forEach(ios, (io) => io.interruptible().fork()))
          .bindValue("fs", ({ head, tail }) => tail.prepend(head))
          .tap(({ fs }) =>
            fs.reduce(Effect.unit, (io, f) =>
              io.flatMap(() => Fiber.await(f).flatMap(arbiter(fs, f, done, fails)))
            )
          )
          .bindValue(
            "inheritRefs",
            () =>
              (res: Tuple<[A, Fiber.Fiber<E, A>]>): Effect<unknown, never, A> =>
                res.get(1).inheritRefs.map(() => res.get(0))
          )
          .flatMap(({ fs, inheritRefs }) =>
            restore(done.await().flatMap(inheritRefs)).onInterrupt(() =>
              fs.reduce(Effect.unit, (io, f) => io.zipLeft(Fiber.interrupt(f)))
            )
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
export function raceAll<R, E, A>(as: Iterable<Effect<R, E, A>>, __etsTrace?: string) {
  return (self: Effect<R, E, A>): Effect<R, E, A> => self.raceAll(as)
}

function arbiter<E, A>(
  fibers: Chunk<Fiber.Fiber<E, A>>,
  winner: Fiber.Fiber<E, A>,
  promise: Promise<E, Tuple<[A, Fiber.Fiber<E, A>]>>,
  fails: Ref.Ref<number>
) {
  return (exit: Exit<E, A>): Effect<unknown, never, void> => {
    return exit.foldEffect(
      (e) =>
        Ref.modify_(fails, (c) =>
          Tuple(c === 0 ? promise.failCause(e).asUnit() : Effect.unit, c - 1)
        ).flatten(),
      (a) =>
        promise
          .succeed(Tuple(a, winner))
          .flatMap((set) =>
            set
              ? fibers.reduce(Effect.unit, (io, f) =>
                  f === winner ? io : io.zipLeft(Fiber.interrupt(f))
                )
              : Effect.unit
          )
    )
  }
}
