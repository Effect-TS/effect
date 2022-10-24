/**
 * @category symbol
 * @since 1.0.0
 */
export const TSetSym = Symbol.for("@effect/core/stm/TSet")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TSetSym = typeof TSetSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _A = Symbol.for("@effect/core/stm/TSet/A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _A = typeof _A

/**
 * Transactional set implemented on top of TMap.
 *
 * @tsplus type effect/core/stm/TSet
 * @category model
 * @since 1.0.0
 */
export interface TSet<A> {
  readonly [TSetSym]: TSetSym
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stm/TSet.Ops
 * @category model
 * @since 1.0.0
 */
export interface TSetOps {
  $: TSetAspects
}
export const TSet: TSetOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TSet.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TSetAspects {}
