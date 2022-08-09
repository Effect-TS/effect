export const TSetSym = Symbol.for("@effect/core/stm/TSet")
export type TSetSym = typeof TSetSym

export const _A = Symbol.for("@effect/core/stm/TSet/A")
export type _A = typeof _A

/**
 * Transactional set implemented on top of TMap.
 *
 * @tsplus type effect/core/stm/TSet
 */
export interface TSet<A> {
  readonly [TSetSym]: TSetSym
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stm/TSet.Ops
 */
export interface TSetOps {
  $: TSetAspects
}
export const TSet: TSetOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TSet.Aspects
 */
export interface TSetAspects {}
