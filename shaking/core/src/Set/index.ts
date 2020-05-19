/* adapted from https://github.com/gcanti/fp-ts */

import { Monoid, Semigroup, Separated, Show } from "../Base"
import { Either } from "../Either"
import { Eq } from "../Eq"
import { Predicate, Refinement } from "../Function"
import { Option } from "../Option"
import { Ord } from "../Ord"
import * as RS from "../Readonly/Set"

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
export const intersection: <A>(
  E: Eq<A>
) => (set: Set<A>, y: Set<A>) => Set<A> = RS.intersection as any

export const getShow: <A>(S: Show<A>) => Show<Set<A>> = RS.getShow

export const toArray: <A>(
  O: Ord<A>
) => (set: Set<A>) => Array<A> = RS.toReadonlyArray as any

export const getEq: <A>(E: Eq<A>) => Eq<Set<A>> = RS.getEq

export const some: <A>(predicate: Predicate<A>) => (set: Set<A>) => boolean = RS.some

/**
 * Projects a Set through a function
 */
export const map: <B>(
  E: Eq<B>
) => <A>(f: (x: A) => B) => (set: Set<A>) => Set<B> = RS.map as any

export const every: <A>(predicate: Predicate<A>) => (set: Set<A>) => boolean = RS.every

export const chain: <B>(
  E: Eq<B>
) => <A>(f: (x: A) => Set<B>) => (set: Set<A>) => Set<B> = RS.chain as any

/**
 * `true` if and only if every element in the first set is an element of the second set
 */
export const subset: <A>(E: Eq<A>) => (x: Set<A>, y: Set<A>) => boolean = RS.isSubset

export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (set: Set<A>) => Set<B>
export function filter<A>(predicate: Predicate<A>): (set: Set<A>) => Set<A>
export function filter<A>(predicate: Predicate<A>): (set: Set<A>) => Set<A> {
  return RS.filter(predicate) as any
}

export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (set: Set<A>) => Separated<Set<A>, Set<B>>
export function partition<A>(
  predicate: Predicate<A>
): (set: Set<A>) => Separated<Set<A>, Set<A>>
export function partition<A>(
  predicate: Predicate<A>
): (set: Set<A>) => Separated<Set<A>, Set<A>> {
  return RS.partition(predicate) as any
}

/**
 * Test if a value is a member of a set
 */
export const elem: <A>(E: Eq<A>) => (a: A, set: Set<A>) => boolean = RS.elem

export const partitionMap: <B, C>(
  EB: Eq<B>,
  EC: Eq<C>
) => <A>(
  f: (a: A) => Either<B, C>
) => (set: Set<A>) => Separated<Set<B>, Set<C>> = RS.partitionMap as any

/**
 * Form the set difference (`x` - `y`)
 *
 * @example
 * import { difference } from '@matechs/core/Set'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.deepStrictEqual(difference(eqNumber)(new Set([1, 2]), new Set([1, 3])), new Set([2]))
 */
export const difference: <A>(
  E: Eq<A>
) => (x: Set<A>, y: Set<A>) => Set<A> = RS.difference as any

export const reduce: <A>(
  O: Ord<A>
) => <B>(b: B, f: (b: B, a: A) => B) => (fa: Set<A>) => B = RS.reduce

export const foldMap: <A, M>(
  O: Ord<A>,
  M: Monoid<M>
) => (f: (a: A) => M) => (fa: Set<A>) => M = RS.foldMap

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

/**
 * Delete a value from a set
 */
export const remove: <A>(
  E: Eq<A>
) => (a: A) => (set: Set<A>) => Set<A> = RS.remove as any

/**
 * Checks an element is a member of a set;
 * If yes, removes the value from the set
 * If no, inserts the value to the set
 */
export function toggle<A>(E: Eq<A>): (a: A) => (set: Set<A>) => Set<A> {
  const elemE = elem(E)
  const removeE = remove(E)
  const insertE = insert(E)
  return (a) => (set) => (elemE(a, set) ? removeE : insertE)(a)(set)
}

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

/**
 * Form the union of two sets
 */
export const union: <A>(
  E: Eq<A>
) => (set: Set<A>, y: Set<A>) => Set<A> = RS.union as any
