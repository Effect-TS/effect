/**
 * Describes a strategy for evaluating multiple effects, potentially in
 * parallel. There are three possible execution strategies: `Sequential`,
 * `Parallel`, and `ParallelN`.
 */
export type ExecutionStrategy = Sequential | Parallel | ParallelN

/**
 * Execute effects sequentially.
 */
export class Sequential {
  readonly _tag = "Sequential"
}

/**
 * Execute effects in parallel.
 */
export class Parallel {
  readonly _tag = "Parallel"
}

/**
 * Execute effects in parallel, up to the specified number of concurrent
 * fibers.
 */
export class ParallelN {
  readonly _tag = "ParallelN"
  constructor(readonly n: number) {}
}

/**
 * Execute effects sequentially.
 */
export const sequential: ExecutionStrategy = new Sequential()

/**
 * Execute effects in parallel.
 */
export const parallel: ExecutionStrategy = new Parallel()

/**
 * Execute effects in parallel, up to the specified number of concurrent
 * fibers.
 */
export function parallelN(n: number): ExecutionStrategy {
  return new ParallelN(n)
}
