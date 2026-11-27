export const median = (values: ReadonlyArray<number>): number => {
  const sorted = values.slice().sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

const percentile = (sorted: ReadonlyArray<number>, probability: number): number => {
  const index = (sorted.length - 1) * probability
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

// mulberry32, so repeated comparisons of the same files print the same intervals
const makeRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

export interface Speedup {
  /** `median(base) / median(head)`: above 1 means head is faster. */
  readonly speedup: number
  readonly low: number
  readonly high: number
}

/**
 * Speedup of `head` over `base`. Each side is a list of rounds (fresh
 * processes) holding samples. The percentile bootstrap resamples rounds, then
 * samples within each chosen round, so noise between processes widens the
 * interval as well as noise between samples.
 */
export const speedup = (
  base: ReadonlyArray<ReadonlyArray<number>>,
  head: ReadonlyArray<ReadonlyArray<number>>,
  { confidence = 0.95, iterations = 2_000, seed = 0x5eed1234 } = {}
): Speedup => {
  const random = makeRandom(seed)
  const pick = <A>(values: ReadonlyArray<A>) => values[Math.floor(random() * values.length)]
  const resample = (rounds: ReadonlyArray<ReadonlyArray<number>>) =>
    median(rounds.flatMap(() => {
      const round = pick(rounds)
      return round.map(() => pick(round))
    }))
  const ratios = Array.from({ length: iterations }, () => resample(base) / resample(head)).sort((a, b) => a - b)
  const tail = (1 - confidence) / 2
  return {
    speedup: median(base.flat()) / median(head.flat()),
    low: percentile(ratios, tail),
    high: percentile(ratios, 1 - tail)
  }
}
