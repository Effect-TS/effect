export const TArraySym = Symbol.for("@effect-ts/core/stm/TArray")
export type TArraySym = typeof TArraySym

/**
 * @tsplus type ets/TArray
 */
export interface TArray<A> {
  readonly [TArraySym]: TArraySym
}

/**
 * @tsplus type ets/TArrayOps
 */
export interface TArrayOps {}
export const TArray: TArrayOps = {}

/**
 * @tsplus unify ets/TArray
 */
export function unifyTArray<X extends TArray<any>>(
  self: X
): TArray<[X] extends [TArray<infer AX>] ? AX : never> {
  return self
}
