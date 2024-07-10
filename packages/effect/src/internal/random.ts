import * as Chunk from "../Chunk.js"
import * as Context from "../Context.js"
import type * as Effect from "../Effect.js"
import { pipe } from "../Function.js"
import * as Hash from "../Hash.js"
import type * as Random from "../Random.js"
import * as PCGRandom from "../Utils.js"
import * as core from "./core.js"

/** @internal */
const RandomSymbolKey = "effect/Random"

/** @internal */
export const RandomTypeId: Random.RandomTypeId = Symbol.for(
  RandomSymbolKey
) as Random.RandomTypeId

/** @internal */
export const randomTag: Context.Tag<Random.Random, Random.Random> = Context.GenericTag("effect/Random")
/** @internal */
class RandomImpl implements Random.Random {
  readonly [RandomTypeId]: Random.RandomTypeId = RandomTypeId

  readonly PRNG: PCGRandom.PCGRandom

  constructor(readonly seed: number) {
    this.PRNG = new PCGRandom.PCGRandom(seed)
  }

  get next(): Effect.Effect<number> {
    return core.sync(() => this.PRNG.number())
  }

  get nextBoolean(): Effect.Effect<boolean> {
    return core.map(this.next, (n) => n > 0.5)
  }

  get nextInt(): Effect.Effect<number> {
    return core.sync(() => this.PRNG.integer(Number.MAX_SAFE_INTEGER))
  }

  nextRange(min: number, max: number): Effect.Effect<number> {
    return core.map(this.next, (n) => (max - min) * n + min)
  }

  nextIntBetween(min: number, max: number): Effect.Effect<number> {
    return core.sync(() => this.PRNG.integer(max - min) + min)
  }

  shuffle<A>(elements: Iterable<A>): Effect.Effect<Chunk.Chunk<A>> {
    return shuffleWith(elements, (n) => this.nextIntBetween(0, n))
  }
}

const shuffleWith = <A>(
  elements: Iterable<A>,
  nextIntBounded: (n: number) => Effect.Effect<number>
): Effect.Effect<Chunk.Chunk<A>> => {
  return core.suspend(() =>
    pipe(
      core.sync(() => Array.from(elements)),
      core.flatMap((buffer) => {
        const numbers: Array<number> = []
        for (let i = buffer.length; i >= 2; i = i - 1) {
          numbers.push(i)
        }
        return pipe(
          numbers,
          core.forEachSequentialDiscard((n) =>
            pipe(
              nextIntBounded(n),
              core.map((k) => swap(buffer, n - 1, k))
            )
          ),
          core.as(Chunk.fromIterable(buffer))
        )
      })
    )
  )
}

const swap = <A>(buffer: Array<A>, index1: number, index2: number): Array<A> => {
  const tmp = buffer[index1]!
  buffer[index1] = buffer[index2]!
  buffer[index2] = tmp
  return buffer
}

export const make = <A>(seed: A): Random.Random => new RandomImpl(Hash.hash(seed))
