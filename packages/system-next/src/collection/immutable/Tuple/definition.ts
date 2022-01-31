import * as St from "../../../prelude/Structural"

export const TupleSym: unique symbol = Symbol.for(
  "@effect-ts/system/collection/immutable/Tuple"
)
export type TupleSym = typeof TupleSym

/**
 * A `Tuple` represents an immutable, finite ordered sequence of elements.
 *
 * @ets type ets/Tuple
 */
export interface Tuple<T extends ReadonlyArray<unknown>> extends Iterable<T[number]> {
  readonly [TupleSym]: TupleSym

  [Symbol.iterator](): IterableIterator<T[number]>

  tuple: T

  get [St.hashSym](): number

  [St.equalsSym](that: unknown): boolean

  get<K extends keyof T>(i: K): T[K]
}

/**
 * @ets type ets/TupleOps
 */
export interface TupleOps {}
export const Tuple: TupleOps = {}

/**
 * @ets unify ets/Tuple
 */
export function unifyTuple<X extends Tuple<any>>(
  self: X
): Tuple<[X] extends [Tuple<infer A>] ? A : never> {
  return self
}
