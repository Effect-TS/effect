export type State = Exited | Running;

export class Exited {
  readonly _tag = "Exited";
  constructor(
    readonly nextKey: number,
    readonly exit: Exit<any, any>,
    readonly update: (finalizer: Finalizer) => Finalizer
  ) {}
}

export class Running {
  readonly _tag = "Running";
  constructor(
    readonly nextKey: number,
    readonly _finalizers: Map<number, Finalizer>,
    readonly update: (finalizer: Finalizer) => Finalizer
  ) {}

  finalizers(): Map<number, Finalizer> {
    return this._finalizers;
  }
}
