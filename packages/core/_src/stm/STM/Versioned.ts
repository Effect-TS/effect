export const VersionedSym = Symbol.for("@effect/core/stm/STM/Versioned")
export type VersionedSym = typeof VersionedSym

/**
 * @tsplus type ets/Versioned
 * @tsplus companion ets/Versioned/Ops
 */
export class Versioned<A> {
  readonly [VersionedSym]: VersionedSym = VersionedSym
  constructor(readonly value: A) {}
}

/**
 * @tsplus static ets/Versioned/Ops __call
 */
export function make<A>(value: A): Versioned<A> {
  return new Versioned(value)
}
