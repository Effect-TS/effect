// ets_tracing: off

export type ExecutionStrategy = Sequential | Parallel | ParallelN

export class Sequential {
  readonly _tag = "Sequential"
}

export class Parallel {
  readonly _tag = "Parallel"
}

export class ParallelN {
  readonly _tag = "ParallelN"
  constructor(readonly n: number) {}
}

/**
 * Sequential execution strategy
 */
export const sequential: ExecutionStrategy = new Sequential()

/**
 * Parallel execution strategy
 */
export const parallel: ExecutionStrategy = new Parallel()

/**
 * Parallel (up to N) execution strategy
 */
export function parallelN(n: number): ExecutionStrategy {
  return new ParallelN(n)
}
