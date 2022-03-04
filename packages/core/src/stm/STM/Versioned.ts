export const VersionedTypeId = Symbol.for("@effect-ts/core/STM/Versioned")
export type VersionedTypeId = typeof VersionedTypeId

/**
 * @tsplus type ets/Versioned
 * @tsplus companion ets/VersionedOps
 */
export class Versioned<A> {
  readonly _typeId: VersionedTypeId = VersionedTypeId
  constructor(readonly value: A) {}
}

/**
 * @tsplus static ets/VersionedOps __call
 */
export function make<A>(value: A): Versioned<A> {
  return new Versioned(value)
}
