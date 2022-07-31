import type { USTM } from "@effect/core/stm/STM/definition"
import { TRandomSym } from "@effect/core/stm/TRandom/definition"
import { Tuple } from "@tsplus/stdlib/data/Tuple"
import type { PCGRandomState } from "@tsplus/stdlib/utilities/RandomPCG"

/**
 * @tsplus static effect/core/stm/TRandom.Ops default
 */
export const defaultTRandom =
  TRef.make(new RandomPCG((Math.random() * 4294967296) >>> 0).getState()).map((_) =>
    new LiveTRandom(_)
  ).commit

/**
 * @tsplus static effect/core/stm/TRandom.Ops live
 */
export const live = Layer.fromEffect(TRandom.Tag, defaultTRandom)

function rndInt(state: PCGRandomState): Tuple<[number, PCGRandomState]> {
  const prng = new RandomPCG()

  prng.setState(state)

  return Tuple(prng.integer(0), prng.getState())
}

function rndIntBetween(
  low: number,
  high: number
): (state: PCGRandomState) => Tuple<[number, PCGRandomState]> {
  return (state: PCGRandomState) => {
    const prng = new RandomPCG()

    prng.setState(state)

    return Tuple(prng.integer(high - low) + low, prng.getState())
  }
}

function rndNumber(state: PCGRandomState): Tuple<[number, PCGRandomState]> {
  const prng = new RandomPCG()

  prng.setState(state)

  return Tuple(prng.number(), prng.getState())
}

export class LiveTRandom implements TRandom {
  readonly [TRandomSym]: TRandomSym = TRandomSym

  constructor(readonly state: TRef<PCGRandomState>) {
  }

  withState<A>(f: (state: PCGRandomState) => Tuple<[A, PCGRandomState]>): USTM<A> {
    return this.state.modify(f)
  }

  get next(): USTM<number> {
    return this.withState(rndNumber)
  }

  get nextBoolean(): USTM<boolean> {
    return this.next.flatMap((n) => STM.succeed(n > 0.5))
  }

  get nextInt(): USTM<number> {
    return this.withState(rndInt)
  }

  nextRange(low: number, high: number): USTM<number> {
    return this.next.flatMap((n) => STM.succeed((high - low) * n + low))
  }

  nextIntBetween(low: number, high: number): USTM<number> {
    return this.withState(rndIntBetween(low, high))
  }

  shuffle<A>(collection: LazyArg<Collection<A>>): USTM<Collection<A>> {
    return shuffleWith(collection, (n) => this.nextIntBetween(0, n))
  }
}

function shuffleWith<A>(
  collection: LazyArg<Collection<A>>,
  nextIntBounded: (n: number) => USTM<number>
): USTM<Chunk<A>> {
  const collection0 = Chunk.from(collection())
  return Do(($) => {
    const buffer = $(TArray.from(collection0))
    const swap = (i1: number, i2: number): USTM<void> =>
      buffer.get(i1)
        .tap(() => buffer.updateSTM(i1, (_) => buffer.get(i2)))
        .tap((tmp) => buffer.update(i2, (_) => tmp)).unit
    const ns: Array<number> = []
    for (let i = collection0.length; i >= 2; i = i - 1) {
      ns.push(i)
    }
    $(STM.forEachDiscard(ns, (n) => nextIntBounded(n).flatMap((k) => swap(n - 1, k))))
    return $(buffer.toChunk)
  })
}
