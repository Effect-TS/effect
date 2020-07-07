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

export const sequential =
  /*#__PURE__*/
  new Sequential()

export const parallel =
  /*#__PURE__*/
  new Parallel()

export const parallelN = (n: number) => new ParallelN(n)
