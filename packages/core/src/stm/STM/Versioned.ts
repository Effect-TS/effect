export const VersionedSym = Symbol.for("@effect/core/stm/STM/Versioned")
export type VersionedSym = typeof VersionedSym

/**
 * @tsplus type effect/core/stm/STM/Versioned
 * @category model
 * @since 1.0.0
 */
export interface Versioned<A> {
  readonly [VersionedSym]: VersionedSym
  readonly value: A
}

/**
 * @tsplus type effect/core/stm/STM/Versioned.Ops
 * @category model
 * @since 1.0.0
 */
export interface VersionedOps {}
export const Versioned: VersionedOps = {}

/**
 * @tsplus static effect/core/stm/STM/Versioned.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make<A>(value: A): Versioned<A> {
  return {
    [VersionedSym]: VersionedSym,
    value
  }
}
