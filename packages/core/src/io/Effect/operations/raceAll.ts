import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Returns an effect that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value. Losers of
 * the race will be interrupted immediately
 *
 * @tsplus static effect/core/io/Effect.Aspects raceAll
 * @tsplus pipeable effect/core/io/Effect raceAll
 * @category constructors
 * @since 1.0.0
 */
export function raceAll<R1, E1, A1>(effects: Iterable<Effect<R1, E1, A1>>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R1, E | E1, A | A1> =>
    Do(($) => {
      const ios = $(Effect.sync(Chunk.fromIterable(effects)))
      const done = $(Deferred.make<E | E1, readonly [A | A1, Fiber<E | E1, A | A1>]>())
      const fails = $(Ref.make(ios.length))
      return $(Effect.uninterruptibleMask(({ restore }) =>
        Do(($) => {
          const head = $(self.interruptible.fork)
          const tail = $(Effect.forEach(ios, (io) => io.interruptible.fork))
          const fs = pipe(tail, Chunk.prepend(head)) as Chunk.Chunk<Fiber.Runtime<E | E1, A | A1>>
          $(pipe(
            fs,
            Chunk.reduce(
              Effect.unit,
              (io, fiber) => io > fiber.await.flatMap(arbiter(fs, fiber, done, fails)).fork
            )
          ))
          const inheritAll = (res: readonly [A | A1, Fiber<E | E1, A | A1>]) =>
            res[1].inheritAll.as(res[0])
          return $(
            restore(done.await.flatMap(inheritAll)).onInterrupt(() =>
              pipe(fs, Chunk.reduce(Effect.unit, (io, fiber) => io.zipLeft(fiber.interrupt)))
            )
          )
        })
      ))
    })
}

function arbiter<E, E1, A, A1>(
  fibers: Chunk.Chunk<Fiber<E | E1, A | A1>>,
  winner: Fiber<E | E1, A | A1>,
  promise: Deferred<E | E1, readonly [A | A1, Fiber<E | E1, A | A1>]>,
  fails: Ref<number>
) {
  return (exit: Exit<E, A | A1>): Effect<never, never, void> => {
    return exit.foldEffect(
      (e) =>
        fails
          .modify((c) => [c === 0 ? promise.failCause(e).unit : Effect.unit, c - 1] as const)
          .flatten,
      (a) =>
        promise
          .succeed([a, winner] as const)
          .flatMap((set) =>
            set
              ? pipe(
                fibers,
                Chunk.reduce(
                  Effect.unit,
                  (io, fiber) => fiber === winner ? io : io.zipLeft(fiber.interrupt)
                )
              )
              : Effect.unit
          )
    )
  }
}
