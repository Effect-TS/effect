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

export const sequential = new Sequential()

export const parallel = new Parallel()

export function parallelN(n: number) {
  return new ParallelN(n)
}
