import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { PCGRandom } from "../_internal/PCG"
import type { Random } from "../definition"

/**
 * @tsplus static ets/RandomOps live
 */
export function live(seed: number): Random {
  const PRNG = new PCGRandom(seed)

  const next: UIO<number> = Effect.succeed(() => PRNG.number())

  const nextBoolean: UIO<boolean> = next.flatMap((n) => Effect.succeed(n > 0.5))

  const nextInt: UIO<number> = Effect.succeed(() => PRNG.integer(0))

  function nextRange(low: number, high: number, __tsplusTrace?: string): UIO<number> {
    return next.flatMap((n) => Effect.succeed((high - low) * n + low))
  }

  function nextIntBetween(
    low: number,
    high: number,
    __tsplusTrace?: string
  ): UIO<number> {
    return Effect.succeed(() => PRNG.integer(1 + high - low) + low)
  }

  function shuffle<A>(
    iterable: LazyArg<Iterable<A>>,
    __tsplusTrace?: string
  ): UIO<Iterable<A>> {
    return shuffleWith(iterable, (n) => nextIntBetween(0, n))
  }

  return {
    next,
    nextBoolean,
    nextInt,
    nextRange,
    nextIntBetween,
    shuffle
  }
}

function shuffleWith<A>(
  iterable: LazyArg<Iterable<A>>,
  nextIntBounded: (n: number) => UIO<number>,
  __tsplusTrace?: string
): UIO<Iterable<A>> {
  return Effect.suspendSucceed(() => {
    const iterable0 = iterable()

    return Effect.Do()
      .bind("buffer", () =>
        Effect.succeed(() => {
          const buffer: Array<A> = []
          for (const element of iterable0) {
            buffer.push(element)
          }
          return buffer
        })
      )
      .bindValue(
        "swap",
        ({ buffer }) =>
          (i1: number, i2: number) =>
            Effect.succeed(() => {
              const tmp = buffer[i1]!
              buffer[i1] = buffer[i2]!
              buffer[i2] = tmp
              return buffer
            })
      )
      .tap(({ buffer, swap }) => {
        const ns: Array<number> = []
        for (let i = buffer.length; i >= 2; i = i - 1) {
          ns.push(i)
        }
        return Effect.forEachDiscard(ns, (n) =>
          nextIntBounded(n).flatMap((k) => swap(n - 1, k))
        )
      })
      .map(({ buffer }) => buffer)
  })
}
