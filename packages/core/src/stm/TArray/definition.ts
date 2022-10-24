/**
 * @category symbol
 * @since 1.0.0
 */
export const TArraySym = Symbol.for("@effect/core/stm/TArray")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TArraySym = typeof TArraySym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _A = Symbol.for("@effect/core/stm/TArray/A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _A = typeof _A

/**
 * @tsplus type effect/core/stm/TArray
 * @category model
 * @since 1.0.0
 */
export interface TArray<A> {
  readonly [TArraySym]: TArraySym
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stm/TArray.Ops
 * @category model
 * @since 1.0.0
 */
export interface TArrayOps {
  $: TArrayAspects
}
export const TArray: TArrayOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TArray.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TArrayAspects {}
