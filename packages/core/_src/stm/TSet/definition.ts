export const TSetSym = Symbol.for("@effect/core/stm/TSet")
export type TSetSym = typeof TSetSym

export const _A = Symbol.for("@effect/core/stm/TSet/A")
export type _A = typeof _A

/**
 * @tsplus type ets/TSet
 */
export interface TSet<A> {
  readonly [TSetSym]: TSetSym
  readonly [_A]: () => A
}

/**
 * @tsplus type ets/TSet/Ops
 */
export interface TSetOps {
  $: TSetAspects
}
export const TSet: TSetOps = {
  $: {}
}

/**
 * @tsplus type ets/TSet/Aspects
 */
export interface TSetAspects {}
