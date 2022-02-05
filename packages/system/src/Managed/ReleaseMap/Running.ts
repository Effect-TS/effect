// ets_tracing: off

import type { Finalizer } from "./finalizer.js"

export class Running {
  readonly _tag = "Running"
  constructor(
    readonly nextKey: number,
    readonly _finalizers: ReadonlyMap<number, Finalizer>
  ) {}

  finalizers(): ReadonlyMap<number, Finalizer> {
    return this._finalizers as any
  }
}
