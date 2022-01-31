// ets_tracing: off

import "../../../Operator/index.js"

export const VersionedTypeId = Symbol()
export type VersionedTypeId = typeof VersionedTypeId

export class Versioned<A> {
  readonly _typeId: VersionedTypeId = VersionedTypeId
  constructor(readonly value: A) {}
}
