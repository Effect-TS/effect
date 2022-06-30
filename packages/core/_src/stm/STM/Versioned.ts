export const VersionedSym = Symbol.for("@effect/core/stm/STM/Versioned")
export type VersionedSym = typeof VersionedSym

/**
 * @tsplus type effect/core/stm/STM/Versioned
 * @tsplus companion effect/core/stm/STM/Versioned.Ops
 */
export class Versioned<A> {
  readonly [VersionedSym]: VersionedSym = VersionedSym
  constructor(readonly value: A) {}
}

/**
 * @tsplus static effect/core/stm/STM/Versioned.Ops __call
 */
export function make<A>(value: A): Versioned<A> {
  return new Versioned(value)
}
