import type * as ExecutionStrategy from "../ExecutionStrategy.js"
import { dual } from "../Function.js"
import type { LazyArg } from "../Function.js"

/** @internal */
export const OP_SEQUENTIAL = "Sequential" as const

/** @internal */
export type OP_SEQUENTIAL = typeof OP_SEQUENTIAL

/** @internal */
export const OP_PARALLEL = "Parallel" as const

/** @internal */
export type OP_PARALLEL = typeof OP_PARALLEL

/** @internal */
export const OP_PARALLEL_N = "ParallelN" as const

/** @internal */
export type OP_PARALLEL_N = typeof OP_PARALLEL_N

/** @internal */
export const sequential: ExecutionStrategy.ExecutionStrategy = { _tag: OP_SEQUENTIAL }

/** @internal */
export const parallel: ExecutionStrategy.ExecutionStrategy = { _tag: OP_PARALLEL }

/** @internal */
export const parallelN = (parallelism: number): ExecutionStrategy.ExecutionStrategy => ({
  _tag: OP_PARALLEL_N,
  parallelism
})

/** @internal */
export const isSequential = (self: ExecutionStrategy.ExecutionStrategy): self is ExecutionStrategy.Sequential =>
  self._tag === OP_SEQUENTIAL

/** @internal */
export const isParallel = (self: ExecutionStrategy.ExecutionStrategy): self is ExecutionStrategy.Parallel =>
  self._tag === OP_PARALLEL

/** @internal */
export const isParallelN = (self: ExecutionStrategy.ExecutionStrategy): self is ExecutionStrategy.ParallelN =>
  self._tag === OP_PARALLEL_N

/** @internal */
export const match = dual<
  <A>(
    onSequential: LazyArg<A>,
    onParallel: LazyArg<A>,
    onParallelN: (n: number) => A
  ) => (self: ExecutionStrategy.ExecutionStrategy) => A,
  <A>(
    self: ExecutionStrategy.ExecutionStrategy,
    onSequential: LazyArg<A>,
    onParallel: LazyArg<A>,
    onParallelN: (n: number) => A
  ) => A
>(4, (self, onSequential, onParallel, onParallelN) => {
  switch (self._tag) {
    case OP_SEQUENTIAL: {
      return onSequential()
    }
    case OP_PARALLEL: {
      return onParallel()
    }
    case OP_PARALLEL_N: {
      return onParallelN(self.parallelism)
    }
  }
})
