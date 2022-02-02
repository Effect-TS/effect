/**
 * Describes a strategy for evaluating multiple effects, potentially in
 * parallel. There are three possible execution strategies: `Sequential`,
 * `Parallel`, and `ParallelN`.
 *
 * @tsplus type ets/ExecutionStrategy
 */
export type ExecutionStrategy = Sequential | Parallel | ParallelN

/**
 * @tsplus type ets/ExecutionStrategyOps
 */
export interface ExecutionStrategyOps {}
export const ExecutionStrategy: ExecutionStrategyOps = {}

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
 *
 * @tsplus static ets/ExecutionStrategyOps Sequential
 */
export const sequential: ExecutionStrategy = new Sequential()

/**
 * Execute effects in parallel.
 *
 * @tsplus static ets/ExecutionStrategyOps Parallel
 */
export const parallel: ExecutionStrategy = new Parallel()

/**
 * Execute effects in parallel, up to the specified number of concurrent
 * fibers.
 *
 * @tsplus static ets/ExecutionStrategyOps ParallelN
 */
export function parallelN(n: number): ExecutionStrategy {
  return new ParallelN(n)
}
