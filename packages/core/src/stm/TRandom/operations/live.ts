import type { RandomState } from "@effect/core/stm/TRandom/definition"
import { TRandomSym } from "@effect/core/stm/TRandom/definition"
import type { Chunk } from "@fp-ts/data/Chunk"
import { PCGRandom } from "@fp-ts/data/Random"

/**
 * @tsplus static effect/core/stm/TRandom.Ops default
 * @category constructors
 * @since 1.0.0
 */
export const defaultTRandom =
  TRef.make(() => new PCGRandom((Math.random() * 4294967296) >>> 0).getState()).map((_) =>
    new LiveTRandom(_)
  ).commit

/**
 * @tsplus static effect/core/stm/TRandom.Ops live
 * @category environment
 * @since 1.0.0
 */
export const live = Layer.fromEffect(TRandom.Tag)(defaultTRandom)

function rndInt(state: RandomState): readonly [number, RandomState] {
  const prng = new PCGRandom()

  prng.setState(state)

  return [prng.integer(0), prng.getState()]
}

function rndIntBetween(
  low: number,
  high: number
): (state: RandomState) => readonly [number, RandomState] {
  return (state: RandomState) => {
    const prng = new PCGRandom()

    prng.setState(state)

    return [prng.integer(high - low) + low, prng.getState()]
  }
}

function rndNumber(state: RandomState): readonly [number, RandomState] {
  const prng = new PCGRandom()

  prng.setState(state)

  return [prng.number(), prng.getState()]
}

export class LiveTRandom implements TRandom {
  readonly [TRandomSym]: TRandomSym = TRandomSym

  constructor(readonly state: TRef<RandomState>) {
  }

  withState<A>(f: (state: RandomState) => readonly [A, RandomState]): STM<never, never, A> {
    return this.state.modify(f)
  }

  get next(): STM<never, never, number> {
    return this.withState(rndNumber)
  }

  get nextBoolean(): STM<never, never, boolean> {
    return this.next.flatMap((n) => STM.succeed(n > 0.5))
  }

  get nextInt(): STM<never, never, number> {
    return this.withState(rndInt)
  }

  nextRange(low: number, high: number): STM<never, never, number> {
    return this.next.flatMap((n) => STM.succeed((high - low) * n + low))
  }

  nextIntBetween(low: number, high: number): STM<never, never, number> {
    return this.withState(rndIntBetween(low, high))
  }

  shuffle<A>(collection: Iterable<A>): STM<never, never, Chunk<A>> {
    return shuffleWith(collection, (n) => this.nextIntBetween(0, n))
  }
}

function shuffleWith<A>(
  collection: Iterable<A>,
  nextIntBounded: (n: number) => STM<never, never, number>
): STM<never, never, Chunk<A>> {
  return Do(($) => {
    const array = Array.from(collection)
    const buffer = $(TArray.from(array))
    const swap = (i1: number, i2: number): STM<never, never, void> =>
      buffer.get(i1)
        .tap(() => buffer.updateSTM(i1, (_) => buffer.get(i2)))
        .tap((tmp) => buffer.update(i2, (_) => tmp)).unit
    const ns: Array<number> = []
    for (let i = array.length; i >= 2; i = i - 1) {
      ns.push(i)
    }
    $(STM.forEachDiscard(ns, (n) => nextIntBounded(n).flatMap((k) => swap(n - 1, k))))
    return $(buffer.toChunk)
  })
}
