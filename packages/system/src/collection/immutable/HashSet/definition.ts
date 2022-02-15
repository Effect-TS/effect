import type { _A } from "../../../support/Symbols"

export const HashSetSym = Symbol.for("@effect-ts/system/collection/immutable/HashSet")
export type HashSetSym = typeof HashSetSym

/**
 * @tsplus type ets/HashSet
 */
export interface HashSet<A> extends Iterable<A> {
  readonly [HashSetSym]: HashSetSym
  readonly [_A]: () => A

  [Symbol.iterator](): Iterator<A>
}

/**
 * @tsplus type ets/HashSetOps
 */
export interface HashSetOps {}
export const HashSet: HashSetOps = {}

/**
 * @tsplus unify ets/HashSet
 */
export function unifyHashSet<X extends HashSet<any>>(
  self: X
): HashSet<[X] extends [HashSet<infer A>] ? A : never> {
  return self
}

/**
 * @tsplus static ets/HashSetOps isHashSet
 */
export function isHashSet<A>(u: Iterable<A>): u is HashSet<A>
export function isHashSet(u: unknown): u is HashSet<unknown>
export function isHashSet(u: unknown): u is HashSet<unknown> {
  return typeof u === "object" && u != null && HashSetSym in u
}
