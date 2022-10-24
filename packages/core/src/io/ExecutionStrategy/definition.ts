/**
 * Describes a strategy for evaluating multiple effects, potentially in
 * parallel. There are three possible execution strategies: `Sequential`,
 * `Parallel`, and `ParallelN`.
 *
 * @tsplus type effect/core/io/ExecutionStrategy
 * @category model
 * @since 1.0.0
 */
export type ExecutionStrategy = Sequential | Parallel | ParallelN

/**
 * @tsplus type effect/core/io/ExecutionStrategy.Ops
 * @category model
 * @since 1.0.0
 */
export interface ExecutionStrategyOps {
  $: ExecutionStrategyAspects
}
export const ExecutionStrategy: ExecutionStrategyOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/ExecutionStrategy.Aspects
 * @category model
 * @since 1.0.0
 */
export interface ExecutionStrategyAspects {}

/**
 * Execute effects sequentially.
 *
 * @category model
 * @since 1.0.0
 */
export interface Sequential {
  readonly _tag: "Sequential"
}

/**
 * Execute effects in parallel.
 *
 * @category model
 * @since 1.0.0
 */
export interface Parallel {
  readonly _tag: "Parallel"
}

/**
 * Execute effects in parallel, up to the specified number of concurrent
 *
 * @category model
 * @since 1.0.0
 * fibers.
 */
export interface ParallelN {
  readonly _tag: "ParallelN"
  readonly n: number
}

/**
 * Execute effects sequentially.
 *
 * @tsplus static effect/core/io/ExecutionStrategy.Ops Sequential
 * @category constructors
 * @since 1.0.0
 */
export const sequential: ExecutionStrategy = { _tag: "Sequential" }

/**
 * Execute effects in parallel.
 *
 * @tsplus static effect/core/io/ExecutionStrategy.Ops Parallel
 * @category constructors
 * @since 1.0.0
 */
export const parallel: ExecutionStrategy = { _tag: "Parallel" }

/**
 * Execute effects in parallel, up to the specified number of concurrent
 * fibers.
 *
 * @tsplus static effect/core/io/ExecutionStrategy.Ops ParallelN
 * @category constructors
 * @since 1.0.0
 */
export function parallelN(n: number): ExecutionStrategy {
  return {
    _tag: "ParallelN",
    n
  }
}
