export const TArraySym = Symbol.for("@effect/core/stm/TArray")
export type TArraySym = typeof TArraySym

export const _A = Symbol.for("@effect/core/stm/TArray/A")
export type _A = typeof _A

/**
 * @tsplus type effect/core/stm/TArray
 */
export interface TArray<A> {
  readonly [TArraySym]: TArraySym
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stm/TArray.Ops
 */
export interface TArrayOps {
  $: TArrayAspects
}
export const TArray: TArrayOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TArray.Aspects
 */
export interface TArrayAspects {}
