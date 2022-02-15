import * as St from "../../../prelude/Structural"
import type { _A } from "../../../support/Symbols"

export const ListTypeId = Symbol.for("@effect-ts/system/collection/immutable/List")
export type ListTypeId = typeof ListTypeId

/**
 * Represents a list of elements.
 *
 * Forked from https://github.com/funkia/list/blob/master/src/index.ts
 *
 * All credits to original authors.
 *
 * The implementation has been forked to adapt to the double standard pipeable/
 * data first available in the remaining modules and to remove the fantasy-land
 * bias.
 *
 * Invariants that any list `l` should satisfy
 *
 * 1. If `l.root !== undefined` then `getSuffixSize(l) !== 0` and
 *    `getPrefixSize(l) !== 0`. The invariant ensures that `first` and
 *    `last` never have to look in the root and that they therefore
 *    take O(1) time.
 * 2. If a tree or sub-tree does not have a size-table then all leaf
 *    nodes in the tree are of size 32.
 *
 * @tsplus type ets/List
 */
export interface List<A> {
  readonly [ListTypeId]: ListTypeId
  readonly [_A]: () => A

  readonly bits: number
  readonly offset: number
  readonly length: number
  readonly prefix: A[]
  readonly root: Node | undefined
  readonly suffix: A[]

  [Symbol.iterator](): Iterator<A>

  get [St.hashSym](): number

  [St.equalsSym](that: unknown): boolean
}

/**
 * @tsplus type ets/ListOps
 */
export interface ListOps {}
export const List: ListOps = {}

/**
 * @tsplus unify ets/List
 */
export function unifyList<X extends List<any>>(
  self: X
): List<[X] extends [List<infer A>] ? A : never> {
  return self
}

export type Sizes = number[] | undefined

export class Node {
  constructor(public sizes: Sizes, public array: any[]) {}
}

/**
 * @tsplus type ets/MutableList
 */
export type MutableList<A> = { -readonly [K in keyof List<A>]: List<A>[K] } & {
  [Symbol.iterator]: () => Iterator<A>
  // This property doesn't exist at run-time. It exists to prevent a
  // MutableList from being assignable to a List.
  "@@mutable": true
}

/**
 * @tsplus type ets/MutableListOps
 */
export interface MutableListOps {}
export const MutableList: MutableListOps = {}
