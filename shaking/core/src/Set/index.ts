/* adapted from https://github.com/gcanti/fp-ts */

import { Separated } from "../Base"
import { Either } from "../Either"
import { Eq } from "../Eq"
import { Predicate, Refinement } from "../Function"
import { Monoid } from "../Monoid"
import { Option } from "../Option"
import { Ord } from "../Ord"
import * as RS from "../Readonly/Set"
import { Semigroup } from "../Semigroup"
import { Show } from "../Show"

export const empty: Set<never> =
  /*#__PURE__*/
  (() => new Set())() as any

export const getIntersectionSemigroup: <A>(
  E: Eq<A>
) => Semigroup<Set<A>> = RS.getIntersectionSemigroup as any

export const getUnionMonoid: <A>(E: Eq<A>) => Monoid<Set<A>> = RS.getUnionMonoid as any

/**
 * The set of elements which are in both the first and second set
 */
export const intersection_: <A>(
  E: Eq<A>
) => (set: Set<A>, y: Set<A>) => Set<A> = RS.intersection_ as any

export const intersection: <A>(
  E: Eq<A>
) => (y: Set<A>) => (set: Set<A>) => Set<A> = RS.intersection as any

export const getShow: <A>(S: Show<A>) => Show<Set<A>> = RS.getShow

export const toArray: <A>(
  O: Ord<A>
) => (set: Set<A>) => Array<A> = RS.toReadonlyArray as any

export const getEq: <A>(E: Eq<A>) => Eq<Set<A>> = RS.getEq

export const some: <A>(predicate: Predicate<A>) => (set: Set<A>) => boolean = RS.some

export const some_: <A>(set: Set<A>, predicate: Predicate<A>) => boolean = RS.some_

/**
 * Projects a Set through a function
 */
export const map: <B>(
  E: Eq<B>
) => <A>(f: (x: A) => B) => (set: Set<A>) => Set<B> = RS.map as any

export const map_: <B>(
  E: Eq<B>
) => <A>(set: Set<A>, f: (x: A) => B) => Set<B> = RS.map_ as any

export const every: <A>(predicate: Predicate<A>) => (set: Set<A>) => boolean = RS.every

export const every_: <A>(set: Set<A>, predicate: Predicate<A>) => boolean = RS.every_

export const chain: <B>(
  E: Eq<B>
) => <A>(f: (x: A) => Set<B>) => (set: Set<A>) => Set<B> = RS.chain as any

export const chain_: <B>(
  E: Eq<B>
) => <A>(set: Set<A>, f: (x: A) => Set<B>) => Set<B> = RS.chain_ as any

/**
 * `true` if and only if every element in the first set is an element of the second set
 */
export const isSubset_: <A>(E: Eq<A>) => (x: Set<A>, y: Set<A>) => boolean =
  RS.isSubset_

export const isSubset: <A>(E: Eq<A>) => (y: Set<A>) => (x: Set<A>) => boolean =
  RS.isSubset

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (set: Set<A>) => Set<B>
  <A>(predicate: Predicate<A>): (set: Set<A>) => Set<A>
} = RS.filter as any

export const filter_: {
  <A, B extends A>(set: Set<A>, refinement: Refinement<A, B>): Set<B>
  <A>(set: Set<A>, predicate: Predicate<A>): Set<A>
} = RS.filter_ as any

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): (
    set: Set<A>
  ) => Separated<Set<A>, Set<B>>
  <A>(predicate: Predicate<A>): (set: Set<A>) => Separated<Set<A>, Set<A>>
} = RS.partition as any

export const partition_: {
  <A, B extends A>(set: Set<A>, refinement: Refinement<A, B>): Separated<Set<A>, Set<B>>
  <A>(set: Set<A>, predicate: Predicate<A>): Separated<Set<A>, Set<A>>
} = RS.partition_ as any

/**
 * Test if a value is a member of a set
 */
export const elem_: <A>(E: Eq<A>) => (set: Set<A>, a: A) => boolean = RS.elem_

export const elem: <A>(E: Eq<A>) => (a: A) => (set: Set<A>) => boolean = RS.elem

export const partitionMap: <B, C>(
  EB: Eq<B>,
  EC: Eq<C>
) => <A>(
  f: (a: A) => Either<B, C>
) => (set: Set<A>) => Separated<Set<B>, Set<C>> = RS.partitionMap as any

export const partitionMap_: <B, C>(
  EB: Eq<B>,
  EC: Eq<C>
) => <A>(
  set: Set<A>,
  f: (a: A) => Either<B, C>
) => Separated<Set<B>, Set<C>> = RS.partitionMap_ as any

/**
 * Form the set difference (`x` - `y`)
 *
 * @example
 * import { difference } from '@matechs/core/Set'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.deepStrictEqual(difference_(eqNumber)(new Set([1, 2]), new Set([1, 3])), new Set([2]))
 */
export const difference_: <A>(
  E: Eq<A>
) => (x: Set<A>, y: Set<A>) => Set<A> = RS.difference_ as any

export const difference: <A>(
  E: Eq<A>
) => (y: Set<A>) => (x: Set<A>) => Set<A> = RS.difference as any

export const reduce: <A>(
  O: Ord<A>
) => <B>(b: B, f: (b: B, a: A) => B) => (fa: Set<A>) => B = RS.reduce

export const reduce_: <A>(
  O: Ord<A>
) => <B>(fa: Set<A>, b: B, f: (b: B, a: A) => B) => B = RS.reduce_

export const foldMap: <A, M>(
  O: Ord<A>,
  M: Monoid<M>
) => (f: (a: A) => M) => (fa: Set<A>) => M = RS.foldMap

export const foldMap_: <A, M>(
  O: Ord<A>,
  M: Monoid<M>
) => (fa: Set<A>, f: (a: A) => M) => M = RS.foldMap_

/**
 * Create a set with one element
 */
export const singleton: <A>(a: A) => Set<A> = RS.singleton as any

/**
 * Insert a value into a set
 */
export const insert: <A>(
  E: Eq<A>
) => (a: A) => (set: Set<A>) => Set<A> = RS.insert as any

export const insert_: <A>(E: Eq<A>) => (set: Set<A>, a: A) => Set<A> = RS.insert_ as any

/**
 * Delete a value from a set
 */
export const remove: <A>(
  E: Eq<A>
) => (a: A) => (set: Set<A>) => Set<A> = RS.remove as any

export const remove_: <A>(E: Eq<A>) => (set: Set<A>, a: A) => Set<A> = RS.remove_ as any

/**
 * Checks an element is a member of a set;
 * If yes, removes the value from the set
 * If no, inserts the value to the set
 */
export const toggle: {
  <A>(E: Eq<A>): (a: A) => (set: Set<A>) => Set<A>
} = RS.toggle as any

export const toggle_: {
  <A>(E: Eq<A>): (set: Set<A>, a: A) => Set<A>
} = RS.toggle_ as any

/**
 * Create a set from an array
 */
export const fromArray: <A>(E: Eq<A>) => (as: Array<A>) => Set<A> = RS.fromArray as any

export const compact: <A>(
  E: Eq<A>
) => (fa: Set<Option<A>>) => Set<A> = RS.compact as any

export const separate: <E, A>(
  EE: Eq<E>,
  EA: Eq<A>
) => (fa: Set<Either<E, A>>) => Separated<Set<E>, Set<A>> = RS.separate as any

export const filterMap: <B>(
  E: Eq<B>
) => <A>(f: (a: A) => Option<B>) => (fa: Set<A>) => Set<B> = RS.filterMap as any

export const filterMap_: <B>(
  E: Eq<B>
) => <A>(fa: Set<A>, f: (a: A) => Option<B>) => Set<B> = RS.filterMap_ as any

/**
 * Form the union of two sets
 */
export const union_: <A>(
  E: Eq<A>
) => (set: Set<A>, y: Set<A>) => Set<A> = RS.union_ as any

export const union: <A>(
  E: Eq<A>
) => (y: Set<A>) => (set: Set<A>) => Set<A> = RS.union as any
