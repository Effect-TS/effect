import type { BenchCase, Instance } from "./cases.ts"

export interface Settings {
  /** Time spent running the case before calibration. */
  readonly warmupMs: number
  /** Target duration of one timed sample; the batch size is calibrated to reach it. */
  readonly sampleMs: number
  readonly samples: number
  /** Stop sampling once a case has run this long and has at least `minSamples`. */
  readonly maxCaseMs: number
  readonly minSamples: number
}

/** One fresh process or page running one case. */
export interface RoundResult {
  readonly batchSize: number
  /** Nanoseconds per operation, one entry per timed batch. */
  readonly samples: ReadonlyArray<number>
  readonly durationMs: number
}

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  value !== null && (typeof value === "object" || typeof value === "function") &&
  typeof (value as PromiseLike<unknown>).then === "function"

const makeBatch = (instance: Instance, async: boolean) =>
  async
    ? async (size: number) => {
      let result: unknown
      for (let i = 0; i < size; i++) result = await instance.run()
      return result
    }
    : (size: number) => {
      let result: unknown
      for (let i = 0; i < size; i++) result = instance.run()
      return result
    }

const time = async (batch: (size: number) => unknown, size: number) => {
  const start = performance.now()
  const result = await batch(size)
  return { elapsedMs: performance.now() - start, result }
}

export const measure = async (benchCase: BenchCase, settings: Settings): Promise<RoundResult> => {
  const started = performance.now()
  const instance = await benchCase.make()
  try {
    // The validated first run counts towards the warmup.
    const warmupEnd = performance.now() + settings.warmupMs
    const first = instance.run()
    const async = isPromiseLike(first)
    instance.validate(await first)
    const batch = makeBatch(instance, async)
    while (performance.now() < warmupEnd) await batch(1)

    const toNsPerOp = (elapsedMs: number) => elapsedMs * 1e6 / (batchSize * benchCase.operations)
    let batchSize = 1
    let calibrated = await time(batch, batchSize)
    while (calibrated.elapsedMs < settings.sampleMs) {
      // Jump close to the target instead of doubling from 1 for fast cases.
      batchSize = Math.max(
        batchSize * 2,
        Math.ceil(batchSize * settings.sampleMs / Math.max(calibrated.elapsedMs, 0.01) * 0.9)
      )
      calibrated = await time(batch, batchSize)
    }

    // The final calibration batch has the measured batch size, so it is the first sample.
    const samples = [toNsPerOp(calibrated.elapsedMs)]
    let result = calibrated.result
    while (
      samples.length < settings.samples &&
      (samples.length < settings.minSamples || performance.now() - started < settings.maxCaseMs)
    ) {
      const sample = await time(batch, batchSize)
      result = sample.result
      samples.push(toNsPerOp(sample.elapsedMs))
    }
    instance.validate(result)
    return { batchSize, samples, durationMs: performance.now() - started }
  } finally {
    await instance.dispose?.()
  }
}

/** Smallest observable `performance.now()` step, which differs widely between hosts. */
export const timerResolutionMs = (): number => {
  let smallest = Infinity
  for (let i = 0; i < 20; i++) {
    const start = performance.now()
    let next = performance.now()
    while (next === start) next = performance.now()
    smallest = Math.min(smallest, next - start)
  }
  return smallest
}
