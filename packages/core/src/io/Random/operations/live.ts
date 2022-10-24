import { RandomSym } from "@effect/core/io/Random/definition"
import * as Chunk from "@fp-ts/data/Chunk"
import { PCGRandom } from "@fp-ts/data/Random"

/**
 * @category constructors
 * @since 1.0.0
 */
export class LiveRandom implements Random {
  readonly [RandomSym]: RandomSym = RandomSym

  readonly PRNG: PCGRandom

  constructor(readonly seed: number) {
    this.PRNG = new PCGRandom(seed)
  }

  get next(): Effect<never, never, number> {
    return Effect.sync(this.PRNG.number())
  }

  get nextBoolean(): Effect<never, never, boolean> {
    return this.next.map((n) => n > 0.5)
  }

  get nextInt(): Effect<never, never, number> {
    return Effect.sync(this.PRNG.integer(0))
  }

  nextRange(low: number, high: number): Effect<never, never, number> {
    return this.next.map((n) => (high - low) * n + low)
  }

  nextIntBetween(low: number, high: number): Effect<never, never, number> {
    return Effect.sync(() => this.PRNG.integer(high - low) + low)
  }

  shuffle<A>(collection: Iterable<A>): Effect<never, never, Chunk.Chunk<A>> {
    return shuffleWith(collection, (n) => this.nextIntBetween(0, n))
  }
}

function shuffleWith<A>(
  collection: Iterable<A>,
  nextIntBounded: (n: number) => Effect<never, never, number>
): Effect<never, never, Chunk.Chunk<A>> {
  return Effect.suspendSucceed(() => {
    return Do(($) => {
      const buffer = $(Effect.sync(() => {
        const buffer: Array<A> = []
        for (const element of collection) {
          buffer.push(element)
        }
        return buffer
      }))
      const swap = (i1: number, i2: number) =>
        Effect.sync(() => {
          const tmp = buffer[i1]!
          buffer[i1] = buffer[i2]!
          buffer[i2] = tmp
          return buffer
        })
      const ns: Array<number> = []
      for (let i = buffer.length; i >= 2; i = i - 1) {
        ns.push(i)
      }
      $(Effect.forEachDiscard(ns, (n) => nextIntBounded(n).flatMap((k) => swap(n - 1, k))))
      return Chunk.fromIterable(buffer)
    })
  })
}

/**
 * @tsplus static effect/core/io/Random.Ops default
 */
export const defaultRandom = new LiveRandom((Math.random() * 4294967296) >>> 0)

/**
 * @tsplus static effect/core/io/Random.Ops live
 */
export const live = Layer.fromValue(Random.Tag, defaultRandom)
