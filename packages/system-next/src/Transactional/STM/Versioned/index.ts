export const VersionedTypeId = Symbol.for("@effect-ts/system/STM/Versioned")
export type VersionedTypeId = typeof VersionedTypeId

export class Versioned<A> {
  readonly _typeId: VersionedTypeId = VersionedTypeId
  constructor(readonly value: A) {}
}
