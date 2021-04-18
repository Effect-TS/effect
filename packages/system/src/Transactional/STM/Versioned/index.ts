// tracing: off

import "../../../Operator"

import * as St from "../../../Structural"

export const VersionedTypeId = Symbol()
export type VersionedTypeId = typeof VersionedTypeId

export class Versioned<A> {
  readonly _typeId: VersionedTypeId = VersionedTypeId
  constructor(readonly value: A) {}

  [St.hashSym](): number {
    return St.hashIncremental(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return this === that
  }
}
