// ets_tracing: off

import type * as BA from "../BoolAlgebra/index.js"

export const SucceededTypeId = Symbol()

export class Succeeded {
  readonly _typeId: typeof SucceededTypeId = SucceededTypeId

  constructor(readonly result: BA.BoolAlgebra<void>) {}
}

export const IgnoredTypeId = Symbol()

export class Ignored {
  readonly _typeId: typeof IgnoredTypeId = IgnoredTypeId

  constructor(readonly result: BA.BoolAlgebra<void>) {}
}

export type TestSuccess = Succeeded | Ignored
