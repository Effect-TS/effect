import { TRandomSym } from "@effect/core/stm/TRandom/definition"
import type { PCGRandomState } from "@tsplus/stdlib/io/Random"

/**
 * @tsplus static effect/core/stm/TRandom.Ops default
 */
export const defaultTRandom =
  TRef.make(new PCGRandom((Math.random() * 4294967296) >>> 0).getState()).map((_) =>
    new LiveTRandom(_)
  ).commit

/**
 * @tsplus static effect/core/stm/TRandom.Ops live
 */
export const live = Layer.fromEffect(TRandom.Tag)(defaultTRandom)

function rndInt(state: PCGRandomState): readonly [number, PCGRandomState] {
  const prng = new PCGRandom()

  prng.setState(state)

  return [prng.integer(0), prng.getState()]
}

function rndIntBetween(
  low: number,
  high: number
): (state: PCGRandomState) => readonly [number, PCGRandomState] {
  return (state: PCGRandomState) => {
    const prng = new PCGRandom()

    prng.setState(state)

    return [prng.integer(high - low) + low, prng.getState()]
  }
}

function rndNumber(state: PCGRandomState): readonly [number, PCGRandomState] {
  const prng = new PCGRandom()

  prng.setState(state)

  return [prng.number(), prng.getState()]
}

export class LiveTRandom implements TRandom {
  readonly [TRandomSym]: TRandomSym = TRandomSym

  constructor(readonly state: TRef<PCGRandomState>) {
  }

  withState<A>(f: (state: PCGRandomState) => readonly [A, PCGRandomState]): STM<never, never, A> {
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

  shuffle<A>(collection: Collection<A>): STM<never, never, Collection<A>> {
    return shuffleWith(collection, (n) => this.nextIntBetween(0, n))
  }
}

function shuffleWith<A>(
  collection: Collection<A>,
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
