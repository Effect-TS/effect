/**
 * @since 2.0.0
 */
import type { Parallel, ParallelN, Sequential } from "./impl/ExecutionStrategy.js"

/**
 * @since 2.0.0
 */
export * from "./impl/ExecutionStrategy.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/ExecutionStrategy.js"

/**
 * @since 2.0.0
 */
export declare namespace ExecutionStrategy {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ExecutionStrategy.js"
}
/**
 * Describes a strategy for evaluating multiple effects, potentially in
 * parallel.
 *
 * There are 3 possible execution strategies: `Sequential`, `Parallel`,
 * `ParallelN`.
 *
 * @since 2.0.0
 * @category models
 */
export type ExecutionStrategy = Sequential | Parallel | ParallelN
