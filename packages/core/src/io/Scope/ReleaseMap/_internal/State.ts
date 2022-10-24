/** @internal */
export type State = Exited | Running

/** @internal */
export class Exited {
  readonly _tag = "Exited"
  constructor(
    readonly nextKey: number,
    readonly exit: Exit<any, any>,
    readonly update: (finalizer: Scope.Finalizer) => Scope.Finalizer
  ) {}
}

/** @internal */
export class Running {
  readonly _tag = "Running"
  constructor(
    readonly nextKey: number,
    readonly _finalizers: Map<number, Scope.Finalizer>,
    readonly update: (finalizer: Scope.Finalizer) => Scope.Finalizer
  ) {}

  finalizers(): Map<number, Scope.Finalizer> {
    return this._finalizers
  }
}
