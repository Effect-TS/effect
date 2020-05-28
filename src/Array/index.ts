/* adapted from https://github.com/gcanti/fp-ts */

import * as AP from "../Apply"
import type {
  Separated,
  CFilterWithIndex1,
  CPartitionWithIndex1,
  CSequence1,
  CTraverse1,
  CTraverseWithIndex1,
  CWilt1,
  CWither1,
  CMonad1,
  CFoldable1,
  CUnfoldable1,
  CTraversableWithIndex1,
  CAlternative1,
  CExtend1,
  CCompactable1,
  CFilterableWithIndex1,
  CWitherable1,
  CFunctorWithIndex1,
  CFoldableWithIndex1,
  CApplicative1,
  RefinementWithIndex,
  PredicateWithIndex,
  PartitionWithIndex1,
  Traverse1,
  TraverseWithIndex1,
  Wither1,
  Wilt1
} from "../Base"
import { Do as DoG } from "../Do"
import type { Either } from "../Either"
import type { Eq } from "../Eq"
import type { Predicate, Refinement } from "../Function"
import type { Monoid } from "../Monoid"
import type { NonEmptyArray } from "../NonEmptyArray"
import type { Option } from "../Option"
import type { Ord } from "../Ord"
import * as RA from "../Readonly/Array"
import type { Show } from "../Show"

export const alt: <A>(that: () => A[]) => (fa: A[]) => A[] = RA.alt as any

export const alt_: <A>(fa: A[], that: () => A[]) => A[] = RA.alt_ as any

export const ap: <A>(fa: A[]) => <B>(fab: ((a: A) => B)[]) => B[] = RA.ap as any

export const ap_: <A, B>(fab: ((a: A) => B)[], fa: A[]) => B[] = RA.ap_ as any

export const apFirst: <B>(fb: B[]) => <A>(fa: A[]) => A[] = RA.apFirst as any

export const apFirst_: <A, B>(fa: A[], fb: B[]) => A[] = RA.apFirst_ as any

export const apSecond: <B>(fb: B[]) => <A>(fa: A[]) => B[] = RA.apSecond as any

export const apSecond_: <A, B>(fa: A[], fb: B[]) => B[] = RA.apSecond_ as any

export const chain: <A, B>(f: (a: A) => B[]) => (ma: A[]) => B[] = RA.chain as any

export const chain_: <A, B>(ma: A[], f: (a: A) => B[]) => B[] = RA.chain_ as any

export const chainFirst: <A, B>(
  f: (a: A) => B[]
) => (ma: A[]) => A[] = RA.chainFirst as any

export const chainFirst_: <A, B>(
  f: (ma: A[], a: A) => B[]
) => A[] = RA.chainFirst_ as any

/**
 * A useful recursion pattern for processing an array to produce a new array, often used for "chopping" up the input
 * array. Typically chop is called with some function that will consume an initial prefix of the array and produce a
 * value and the rest of the array.
 *
 * @example
 * import { Eq, eqNumber } from '@matechs/core/Eq'
 * import { chop, spanLeft } from '@matechs/core/Array'
 *
 * const group = <A>(S: Eq<A>): ((as: Array<A>) => Array<Array<A>>) => {
 *   return chop(as => {
 *     const { init, rest } = spanLeft((a: A) => S.equals(a, as[0]))(as)
 *     return [init, rest]
 *   })
 * }
 * assert.deepStrictEqual(group(eqNumber)([1, 1, 2, 3, 3, 4]), [[1, 1], [2], [3, 3], [4]])
 *
 */
export const chop: <A, B>(
  f: (as: NonEmptyArray<A>) => [B, Array<A>]
) => (as: Array<A>) => Array<B> = RA.chop as any

export const chop_: <A, B>(
  as: Array<A>,
  f: (as: NonEmptyArray<A>) => [B, Array<A>]
) => Array<B> = RA.chop_ as any

/**
 * Splits an array into length-`n` pieces. The last piece will be shorter if `n` does not evenly divide the length of
 * the array. Note that `chunksOf(n)([])` is `[]`, not `[[]]`. This is intentional, and is consistent with a recursive
 * definition of `chunksOf`; it satisfies the property that
 *
 * ```ts
 * chunksOf(n)(xs).concat(chunksOf(n)(ys)) == chunksOf(n)(xs.concat(ys)))
 * ```
 *
 * whenever `n` evenly divides the length of `xs`.
 *
 * @example
 * import { chunksOf } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(chunksOf(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4], [5]])
 */
export const chunksOf: (
  n: number
) => <A>(as: Array<A>) => Array<Array<A>> = RA.chunksOf as any

export const chunksOf_: <A>(
  as: Array<A>,
  n: number
) => Array<Array<A>> = RA.chunksOf_ as any

export const compact: <A>(fa: Option<A>[]) => A[] = RA.compact as any

/**
 * Array comprehension
 *
 * ```
 * [ f(x, y, ...) | x ← xs, y ← ys, ..., g(x, y, ...) ]
 * ```
 *
 * @example
 * import { comprehension } from '@matechs/core/Array'
 * import { tuple } from '@matechs/core/Function'
 *
 * assert.deepStrictEqual(comprehension([[1, 2, 3], ['a', 'b']], tuple, (a, b) => (a + b.length) % 2 === 0), [
 *   [1, 'a'],
 *   [1, 'b'],
 *   [3, 'a'],
 *   [3, 'b']
 * ])
 */
export function comprehension<A, B, C, D, R>(
  input: [Array<A>, Array<B>, Array<C>, Array<D>],
  f: (a: A, b: B, c: C, d: D) => R,
  g?: (a: A, b: B, c: C, d: D) => boolean
): Array<R>
export function comprehension<A, B, C, R>(
  input: [Array<A>, Array<B>, Array<C>],
  f: (a: A, b: B, c: C) => R,
  g?: (a: A, b: B, c: C) => boolean
): Array<R>
export function comprehension<A, R>(
  input: [Array<A>],
  f: (a: A) => R,
  g?: (a: A) => boolean
): Array<R>
export function comprehension<A, B, R>(
  input: [Array<A>, Array<B>],
  f: (a: A, b: B) => R,
  g?: (a: A, b: B) => boolean
): Array<R>
export function comprehension<A, R>(
  input: [Array<A>],
  f: (a: A) => boolean,
  g?: (a: A) => R
): Array<R>
export function comprehension<R>(
  input: Array<Array<any>>,
  f: (...xs: Array<any>) => R,
  g: (...xs: Array<any>) => boolean = () => true
): Array<R> {
  return RA.comprehension(input as any, f, g) as any
}

/**
 * Attaches an element to the front of an array, creating a new non empty array
 *
 * @example
 * import { cons } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(cons(0, [1, 2, 3]), [0, 1, 2, 3])
 */
export const cons_: <A>(tail: Array<A>, head: A) => NonEmptyArray<A> = RA.cons_ as any

export const cons: <A>(head: A) => (tail: Array<A>) => NonEmptyArray<A> = RA.cons as any

export const copy: <A>(as: Array<A>) => Array<A> = RA.toArray

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { deleteAt } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(deleteAt(0)([1, 2, 3]), some([2, 3]))
 * assert.deepStrictEqual(deleteAt(1)([]), none)
 */
export const deleteAt: (
  i: number
) => <A>(as: Array<A>) => Option<Array<A>> = RA.deleteAt as any

export const deleteAt_: <A>(
  as: Array<A>,
  i: number
) => Option<Array<A>> = RA.deleteAt_ as any

/**
 * Creates an array of array values not included in the other given array using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 *
 * @example
 * import { difference } from '@matechs/core/Array'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.deepStrictEqual(difference(eqNumber)([1, 2], [2, 3]), [1])
 */
export const difference: <A>(
  E: Eq<A>
) => (xs: Array<A>, ys: Array<A>) => Array<A> = RA.difference as any

/**
 * Drop a number of elements from the start of an array, creating a new array
 *
 * @example
 * import { dropLeft } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(dropLeft(2)([1, 2, 3]), [3])
 */
export const dropLeft: (n: number) => <A>(as: Array<A>) => Array<A> = RA.dropLeft as any

export const dropLeft_: <A>(as: Array<A>, n: number) => Array<A> = RA.dropLeft_ as any

/**
 * Remove the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * @example
 * import { dropLeftWhile } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(dropLeftWhile((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), [2, 4, 5])
 */
export const dropLeftWhile: <A>(
  predicate: Predicate<A>
) => (as: Array<A>) => Array<A> = RA.dropLeftWhile as any

export const dropLeftWhile_: <A>(
  as: Array<A>,
  predicate: Predicate<A>
) => Array<A> = RA.dropLeftWhile_ as any

/**
 * Drop a number of elements from the end of an array, creating a new array
 *
 * @example
 * import { dropRight } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(dropRight(2)([1, 2, 3, 4, 5]), [1, 2, 3])
 */
export const dropRight: (
  n: number
) => <A>(as: Array<A>) => Array<A> = RA.dropRight as any

export const dropRight_: <A>(as: Array<A>, n: number) => Array<A> = RA.dropRight_ as any

export const duplicate: <A>(ma: A[]) => A[][] = RA.duplicate as any

/**
 * Test if a value is a member of an array. Takes a `Eq<A>` as a single
 * argument which returns the function to use to search for a value of type `A` in
 * an array of type `Array<A>`.
 *
 * @example
 * import { elem } from '@matechs/core/Array'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.strictEqual(elem(eqNumber)(1, [1, 2, 3]), true)
 * assert.strictEqual(elem(eqNumber)(4, [1, 2, 3]), false)
 */
export const elem_: <A>(E: Eq<A>) => (as: Array<A>, a: A) => boolean = RA.elem_

export const elem: <A>(E: Eq<A>) => (a: A) => (as: Array<A>) => boolean = RA.elem

/**
 * An empty array
 */
export const empty: Array<never> = []

export const extend: <A, B>(f: (fa: A[]) => B) => (ma: A[]) => B[] = RA.extend as any

export const extend_: <A, B>(ma: A[], f: (fa: A[]) => B) => B[] = RA.extend_ as any

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (fa: A[]) => B[]
  <A>(predicate: Predicate<A>): (fa: A[]) => A[]
} = RA.filter as any

export const filter_: {
  <A, B extends A>(fa: A[], refinement: Refinement<A, B>): B[]
  <A>(fa: A[], predicate: Predicate<A>): A[]
} = RA.filter_ as any

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => (fa: A[]) => B[] = RA.filterMap as any

export const filterMap_: <A, B>(
  f: (fa: A[], a: A) => Option<B>
) => B[] = RA.filterMap_ as any

export const filterMapWithIndex: <A, B>(
  f: (i: number, a: A) => Option<B>
) => (fa: A[]) => B[] = RA.filterMapWithIndex as any

export const filterMapWithIndex_: <A, B>(
  fa: A[],
  f: (i: number, a: A) => Option<B>
) => B[] = RA.filterMapWithIndex_ as any

export const filterWithIndex: CFilterWithIndex1<URI, number> = RA.filterWithIndex as any

export const filterWithIndex_: {
  <A, B extends A>(fa: A[], refinementWithIndex: RefinementWithIndex<number, A, B>): B[]
  <A>(fa: A[], predicateWithIndex: PredicateWithIndex<number, A>): A[]
} = RA.filterWithIndex_ as any

/**
 * Find the first element which satisfies a predicate (or a refinement) function
 *
 * @example
 * import { findFirst } from '@matechs/core/Array'
 * import { some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(findFirst((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 1 }))
 */
export function findFirst<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Option<B>
export function findFirst<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A>
export function findFirst<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A> {
  return RA.findFirst(predicate)
}

export function findFirst_<A, B extends A>(
  as: Array<A>,
  refinement: Refinement<A, B>
): Option<B>
export function findFirst_<A>(as: Array<A>, predicate: Predicate<A>): Option<A>
export function findFirst_<A>(as: Array<A>, predicate: Predicate<A>): Option<A> {
  return RA.findFirst_(as, predicate)
}

/**
 * Find the first element returned by an option based selector function
 *
 * @example
 * import { findFirstMap } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * interface Person {
 *   name: string
 *   age?: number
 * }
 *
 * const persons: Array<Person> = [{ name: 'John' }, { name: 'Mary', age: 45 }, { name: 'Joey', age: 28 }]
 *
 * // returns the name of the first person that has an age
 * assert.deepStrictEqual(findFirstMap((p: Person) => (p.age === undefined ? none : some(p.name)))(persons), some('Mary'))
 */
export const findFirstMap: <A, B>(
  f: (a: A) => Option<B>
) => (as: Array<A>) => Option<B> = RA.findFirstMap

export const findFirstMap_: <A, B>(as: Array<A>, f: (a: A) => Option<B>) => Option<B> =
  RA.findFirstMap_

/**
 * Find the first index for which a predicate holds
 *
 * @example
 * import { findIndex } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(findIndex((n: number) => n === 2)([1, 2, 3]), some(1))
 * assert.deepStrictEqual(findIndex((n: number) => n === 2)([]), none)
 */
export const findIndex: <A>(
  predicate: Predicate<A>
) => (as: Array<A>) => Option<number> = RA.findIndex

export const findIndex_: <A>(as: Array<A>, predicate: Predicate<A>) => Option<number> =
  RA.findIndex_

/**
 * Find the last element which satisfies a predicate function
 *
 * @example
 * import { findLast } from '@matechs/core/Array'
 * import { some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(findLast((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 2 }))
 */
export function findLast<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Option<B>
export function findLast<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A>
export function findLast<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A> {
  return RA.findLast(predicate)
}

export function findLast_<A, B extends A>(
  as: Array<A>,
  refinement: Refinement<A, B>
): Option<B>
export function findLast_<A>(as: Array<A>, predicate: Predicate<A>): Option<A>
export function findLast_<A>(as: Array<A>, predicate: Predicate<A>): Option<A> {
  return RA.findLast_(as, predicate)
}

/**
 * Returns the index of the last element of the list which matches the predicate
 *
 * @example
 * import { findLastIndex } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * interface X {
 *   a: number
 *   b: number
 * }
 * const xs: Array<X> = [{ a: 1, b: 0 }, { a: 1, b: 1 }]
 * assert.deepStrictEqual(findLastIndex((x: { a: number }) => x.a === 1)(xs), some(1))
 * assert.deepStrictEqual(findLastIndex((x: { a: number }) => x.a === 4)(xs), none)
 */
export const findLastIndex: <A>(
  predicate: Predicate<A>
) => (as: Array<A>) => Option<number> = RA.findLastIndex

export const findLastIndex_: <A>(
  as: Array<A>,
  predicate: Predicate<A>
) => Option<number> = RA.findLastIndex_

/**
 * Find the last element returned by an option based selector function
 *
 * @example
 * import { findLastMap } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * interface Person {
 *   name: string
 *   age?: number
 * }
 *
 * const persons: Array<Person> = [{ name: 'John' }, { name: 'Mary', age: 45 }, { name: 'Joey', age: 28 }]
 *
 * // returns the name of the last person that has an age
 * assert.deepStrictEqual(findLastMap((p: Person) => (p.age === undefined ? none : some(p.name)))(persons), some('Joey'))
 */
export const findLastMap: <A, B>(
  f: (a: A) => Option<B>
) => (as: Array<A>) => Option<B> = RA.findLastMap

export const findLastMap_: <A, B>(as: Array<A>, f: (a: A) => Option<B>) => Option<B> =
  RA.findLastMap_

/**
 * Removes one level of nesting
 *
 * @example
 * import { flatten } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(flatten([[1], [2], [3]]), [1, 2, 3])
 */
export const flatten: <A>(mma: Array<Array<A>>) => Array<A> = RA.flatten as any

/**
 * Break an array into its first element and remaining elements
 *
 * @example
 * import { foldLeft } from '@matechs/core/Array'
 *
 * const len: <A>(as: Array<A>) => number = foldLeft(() => 0, (_, tail) => 1 + len(tail))
 * assert.strictEqual(len([1, 2, 3]), 3)
 */
export const foldLeft: <A, B>(
  onNil: () => B,
  onCons: (head: A, tail: Array<A>) => B
) => (as: Array<A>) => B = RA.foldLeft as any

export const foldLeft_: <A, B>(
  as: Array<A>,
  onNil: () => B,
  onCons: (head: A, tail: Array<A>) => B
) => B = RA.foldLeft_ as any

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: A[]) => M = RA.foldMap as any

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: A[], f: (a: A) => M) => M = RA.foldMap_ as any

export const foldMapWithIndex: <M>(
  M: Monoid<M>
) => <A>(f: (i: number, a: A) => M) => (fa: A[]) => M = RA.foldMapWithIndex as any

export const foldMapWithIndex_: <M>(
  M: Monoid<M>
) => <A>(fa: A[], f: (i: number, a: A) => M) => M = RA.foldMapWithIndex_ as any

/**
 * Break an array into its initial elements and the last element
 */
export const foldRight: <A, B>(
  onNil: () => B,
  onCons: (init: Array<A>, last: A) => B
) => (as: Array<A>) => B = RA.foldRight as any

export const foldRight_: <A, B>(
  as: Array<A>,
  onNil: () => B,
  onCons: (init: Array<A>, last: A) => B
) => B = RA.foldRight as any

/**
 * Derives an `Eq` over the `Array` of a given element type from the `Eq` of that type. The derived `Eq` defines two
 * arrays as equal if all elements of both arrays are compared equal pairwise with the given `E`. In case of arrays of
 * different lengths, the result is non equality.
 *
 * @example
 * import { eqString } from '@matechs/core/Eq'
 * import { getEq } from '@matechs/core/Array'
 *
 * const E = getEq(eqString)
 * assert.strictEqual(E.equals(['a', 'b'], ['a', 'b']), true)
 * assert.strictEqual(E.equals(['a'], []), false)
 */
export const getEq: <A>(E: Eq<A>) => Eq<Array<A>> = RA.getEq

/**
 * Returns a `Monoid` for `Array<A>`
 *
 * @example
 * import { getMonoid } from '@matechs/core/Array'
 *
 * const M = getMonoid<number>()
 * assert.deepStrictEqual(M.concat([1, 2], [3, 4]), [1, 2, 3, 4])
 */
export const getMonoid: <A = never>() => Monoid<Array<A>> = RA.getMonoid as any

/**
 * Derives an `Ord` over the `Array` of a given element type from the `Ord` of that type. The ordering between two such
 * arrays is equal to: the first non equal comparison of each arrays elements taken pairwise in increasing order, in
 * case of equality over all the pairwise elements; the longest array is considered the greatest, if both arrays have
 * the same length, the result is equality.
 *
 * @example
 * import { getOrd } from '@matechs/core/Array'
 * import { ordString } from '@matechs/core/Ord'
 *
 * const O = getOrd(ordString)
 * assert.strictEqual(O.compare(['b'], ['a']), 1)
 * assert.strictEqual(O.compare(['a'], ['a']), 0)
 * assert.strictEqual(O.compare(['a'], ['b']), -1)
 */
export const getOrd: <A>(O: Ord<A>) => Ord<Array<A>> = RA.getOrd

export const getShow: <A>(S: Show<A>) => Show<Array<A>> = RA.getShow

/**
 * Get the first element in an array, or `None` if the array is empty
 *
 * @example
 * import { head } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(head([1, 2, 3]), some(1))
 * assert.deepStrictEqual(head([]), none)
 */
export const head: <A>(as: Array<A>) => Option<A> = RA.head

/**
 * Get all but the last element of an array, creating a new array, or `None` if the array is empty
 *
 * @example
 * import { init } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(init([1, 2, 3]), some([1, 2]))
 * assert.deepStrictEqual(init([]), none)
 */
export const init: <A>(as: Array<A>) => Option<Array<A>> = RA.init as any

/**
 * Insert an element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { insertAt } from '@matechs/core/Array'
 * import { some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(insertAt(2, 5)([1, 2, 3, 4]), some([1, 2, 5, 3, 4]))
 */
export const insertAt: <A>(
  i: number,
  a: A
) => (as: Array<A>) => Option<Array<A>> = RA.insertAt as any

export const insertAt_: <A>(
  as: Array<A>,
  i: number,
  a: A
) => Option<Array<A>> = RA.insertAt_ as any

/**
 * Creates an array of unique values that are included in all given arrays using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 *
 * @example
 * import { intersection } from '@matechs/core/Array'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.deepStrictEqual(intersection(eqNumber)([1, 2], [2, 3]), [2])
 */
export const intersection: <A>(
  E: Eq<A>
) => (xs: Array<A>, ys: Array<A>) => Array<A> = RA.intersection as any

/**
 * Test whether an array is empty
 *
 * @example
 * import { isEmpty } from '@matechs/core/Array'
 *
 * assert.strictEqual(isEmpty([]), true)
 */
export const isEmpty: <A>(as: Array<A>) => boolean = RA.isEmpty

/**
 * Test whether an array is non empty narrowing down the type to `NonEmptyArray<A>`
 */
export const isNonEmpty: <A>(
  as: Array<A>
) => as is NonEmptyArray<A> = RA.isNonEmpty as any

/**
 * Test whether an array contains a particular index
 */
export const isOutOfBound: <A>(i: number, as: Array<A>) => boolean = RA.isOutOfBound

/**
 * Get the last element in an array, or `None` if the array is empty
 *
 * @example
 * import { last } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(last([1, 2, 3]), some(3))
 * assert.deepStrictEqual(last([]), none)
 */
export const last: <A>(as: Array<A>) => Option<A> = RA.last

/**
 * Extracts from an array of `Either` all the `Left` elements. All the `Left` elements are extracted in order
 *
 * @example
 * import { lefts } from '@matechs/core/Array'
 * import { left, right } from '@matechs/core/Either'
 *
 * assert.deepStrictEqual(lefts([right(1), left('foo'), right(2)]), ['foo'])
 */
export const lefts: <E, A>(as: Array<Either<E, A>>) => Array<E> = RA.lefts as any

/**
 * This function provides a safe way to read a value at a particular index from an array
 *
 * @example
 * import { lookup } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(lookup(1, [1, 2, 3]), some(2))
 * assert.deepStrictEqual(lookup(3, [1, 2, 3]), none)
 */
export const lookup_: <A>(i: number, as: Array<A>) => Option<A> = RA.lookup_

export const lookup: (i: number) => <A>(as: Array<A>) => Option<A> = RA.lookup

/**
 * Return a list of length `n` with element `i` initialized with `f(i)`
 *
 * @example
 * import { makeBy } from '@matechs/core/Array'
 *
 * const double = (n: number): number => n * 2
 * assert.deepStrictEqual(makeBy(5, double), [0, 2, 4, 6, 8])
 */
export const makeBy: <A>(n: number, f: (i: number) => A) => Array<A> = RA.makeBy as any

export const map: <A, B>(f: (a: A) => B) => (fa: A[]) => B[] = RA.map as any

export const map_: <A, B>(a: A[], f: (a: A) => B) => B[] = RA.map_ as any

export const mapWithIndex: <A, B>(
  f: (i: number, a: A) => B
) => (fa: A[]) => B[] = RA.mapWithIndex as any

export const mapWithIndex_: <A, B>(
  fa: A[],
  f: (i: number, a: A) => B
) => B[] = RA.mapWithIndex_ as any

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @example
 * import { modifyAt } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * const double = (x: number): number => x * 2
 * assert.deepStrictEqual(modifyAt(1, double)([1, 2, 3]), some([1, 4, 3]))
 * assert.deepStrictEqual(modifyAt(1, double)([]), none)
 */
export const modifyAt: <A>(
  i: number,
  f: (a: A) => A
) => (as: Array<A>) => Option<Array<A>> = RA.modifyAt as any

export const modifyAt_: <A>(
  as: Array<A>,
  i: number,
  f: (a: A) => A
) => Option<Array<A>> = RA.modifyAt_ as any

export const of: <A>(a: A) => Array<A> = RA.of as any

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): (fa: A[]) => Separated<A[], B[]>
  <A>(predicate: Predicate<A>): (fa: A[]) => Separated<A[], A[]>
} = RA.partition as any

export const partition_: {
  <A, B extends A>(fa: A[], refinement: Refinement<A, B>): Separated<A[], B[]>
  <A>(fa: A[], predicate: Predicate<A>): Separated<A[], A[]>
} = RA.partition_ as any

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (fa: A[]) => Separated<B[], C[]> = RA.partitionMap as any

export const partitionMap_: <A, B, C>(
  fa: A[],
  f: (a: A) => Either<B, C>
) => Separated<B[], C[]> = RA.partitionMap_ as any

export const partitionMapWithIndex: <A, B, C>(
  f: (i: number, a: A) => Either<B, C>
) => (fa: A[]) => Separated<B[], C[]> = RA.partitionMapWithIndex as any

export const partitionMapWithIndex_: <A, B, C>(
  fa: A[],
  f: (i: number, a: A) => Either<B, C>
) => Separated<B[], C[]> = RA.partitionMapWithIndex_ as any

export const partitionWithIndex: CPartitionWithIndex1<
  URI,
  number
> = RA.partitionWithIndex as any

export const partitionWithIndex_: PartitionWithIndex1<
  URI,
  number
> = RA.partitionWithIndex_ as any

/**
 * Create an array containing a range of integers, including both endpoints
 *
 * @example
 * import { range } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(range(1, 5), [1, 2, 3, 4, 5])
 */
export const range: (start: number, end: number) => Array<number> = RA.range as any

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: A[]) => B = RA.reduce as any

export const reduce_: <A, B>(
  fa: A[],
  b: B,
  f: (b: B, a: A) => B
) => B = RA.reduce_ as any

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: A[]) => B = RA.reduceRight as any

export const reduceRight_: <A, B>(
  fa: A[],
  b: B,
  f: (a: A, b: B) => B
) => B = RA.reduceRight_ as any

export const reduceRightWithIndex: <A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
) => (fa: A[]) => B = RA.reduceRightWithIndex as any

export const reduceRightWithIndex_: <A, B>(
  fa: A[],
  b: B,
  f: (i: number, a: A, b: B) => B
) => B = RA.reduceRightWithIndex_ as any

export const reduceWithIndex: <A, B>(
  b: B,
  f: (i: number, b: B, a: A) => B
) => (fa: A[]) => B = RA.reduceWithIndex as any

export const reduceWithIndex_: <A, B>(
  fa: A[],
  b: B,
  f: (i: number, b: B, a: A) => B
) => B = RA.reduceWithIndex_ as any

/**
 * Create an array containing a value repeated the specified number of times
 *
 * @example
 * import { replicate } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(replicate(3, 'a'), ['a', 'a', 'a'])
 */
export const replicate: <A>(n: number, a: A) => Array<A> = RA.replicate as any

/**
 * Reverse an array, creating a new array
 *
 * @example
 * import { reverse } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(reverse([1, 2, 3]), [3, 2, 1])
 */
export const reverse: <A>(as: Array<A>) => Array<A> = RA.reverse as any

/**
 * Extracts from an array of `Either` all the `Right` elements. All the `Right` elements are extracted in order
 *
 * @example
 * import { rights } from '@matechs/core/Array'
 * import { right, left } from '@matechs/core/Either'
 *
 * assert.deepStrictEqual(rights([right(1), left('foo'), right(2)]), [1, 2])
 */
export const rights: <E, A>(as: Array<Either<E, A>>) => Array<A> = RA.rights as any

/**
 * Rotate an array to the right by `n` steps
 *
 * @example
 * import { rotate } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(rotate(2)([1, 2, 3, 4, 5]), [4, 5, 1, 2, 3])
 */
export const rotate: (n: number) => <A>(as: Array<A>) => Array<A> = RA.rotate as any

export const rotate_: <A>(as: Array<A>, n: number) => Array<A> = RA.rotate_ as any

/**
 * Same as `reduce` but it carries over the intermediate steps
 *
 * ```ts
 * import { scanLeft } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(scanLeft(10, (b, a: number) => b - a)([1, 2, 3]), [10, 9, 7, 4])
 * ```
 */
export const scanLeft: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (as: Array<A>) => Array<B> = RA.scanLeft as any

export const scanLeft_: <A, B>(
  as: Array<A>,
  b: B,
  f: (b: B, a: A) => B
) => Array<B> = RA.scanLeft_ as any

/**
 * Fold an array from the right, keeping all intermediate results instead of only the final result
 *
 * @example
 * import { scanRight } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(scanRight(10, (a: number, b) => b - a)([1, 2, 3]), [4, 5, 7, 10])
 */
export const scanRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (as: Array<A>) => Array<B> = RA.scanRight as any

export const scanRight_: <A, B>(
  as: Array<A>,
  b: B,
  f: (a: A, b: B) => B
) => Array<B> = RA.scanRight_ as any

export const separate: <A, B>(
  fa: Either<A, B>[]
) => Separated<A[], B[]> = RA.separate as any

export const sequence: CSequence1<URI> = RA.sequence as any

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @example
 * import { snoc } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(snoc([1, 2, 3], 4), [1, 2, 3, 4])
 */
export const snoc_: <A>(init: Array<A>, end: A) => NonEmptyArray<A> = RA.snoc_ as any

export const snoc: <A>(end: A) => (init: Array<A>) => NonEmptyArray<A> = RA.snoc as any

/**
 * Sort the elements of an array in increasing order, creating a new array
 *
 * @example
 * import { sort } from '@matechs/core/Array'
 * import { ordNumber } from '@matechs/core/Ord'
 *
 * assert.deepStrictEqual(sort(ordNumber)([3, 2, 1]), [1, 2, 3])
 */
export const sort: <A>(O: Ord<A>) => (as: Array<A>) => Array<A> = RA.sort as any

export const sort_: <A>(as: Array<A>, O: Ord<A>) => Array<A> = RA.sort_ as any

/**
 * Sort the elements of an array in increasing order, where elements are compared using first `ords[0]`, then `ords[1]`,
 * etc...
 *
 * @example
 * import { sortBy } from '@matechs/core/Array'
 * import { ord, ordString, ordNumber } from '@matechs/core/Ord'
 *
 * interface Person {
 *   name: string
 *   age: number
 * }
 * const byName = ord.contramap(ordString, (p: Person) => p.name)
 * const byAge = ord.contramap(ordNumber, (p: Person) => p.age)
 *
 * const sortByNameByAge = sortBy([byName, byAge])
 *
 * const persons = [{ name: 'a', age: 1 }, { name: 'b', age: 3 }, { name: 'c', age: 2 }, { name: 'b', age: 2 }]
 * assert.deepStrictEqual(sortByNameByAge(persons), [
 *   { name: 'a', age: 1 },
 *   { name: 'b', age: 2 },
 *   { name: 'b', age: 3 },
 *   { name: 'c', age: 2 }
 * ])
 */
export const sortBy: <A>(
  ords: Array<Ord<A>>
) => (as: Array<A>) => Array<A> = RA.sortBy as any

export const sortBy_: <A>(
  as: Array<A>,
  ords: Array<Ord<A>>
) => Array<A> = RA.sortBy_ as any

/**
 * Split an array into two parts:
 * 1. the longest initial subarray for which all elements satisfy the specified predicate
 * 2. the remaining elements
 *
 * @example
 * import { spanLeft } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(spanLeft((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), { init: [1, 3], rest: [2, 4, 5] })
 */
export function spanLeft<A, B extends A>(
  refinement: Refinement<A, B>
): (
  as: Array<A>
) => {
  init: Array<B>
  rest: Array<A>
}
export function spanLeft<A>(
  predicate: Predicate<A>
): (
  as: Array<A>
) => {
  init: Array<A>
  rest: Array<A>
}
export function spanLeft<A>(
  predicate: Predicate<A>
): (
  as: Array<A>
) => {
  init: Array<A>
  rest: Array<A>
} {
  return RA.spanLeft(predicate) as any
}

export function spanLeft_<A, B extends A>(
  as: Array<A>,
  refinement: Refinement<A, B>
): {
  init: Array<B>
  rest: Array<A>
}
export function spanLeft_<A>(
  as: Array<A>,
  predicate: Predicate<A>
): {
  init: Array<A>
  rest: Array<A>
}
export function spanLeft_<A>(
  as: Array<A>,
  predicate: Predicate<A>
): {
  init: Array<A>
  rest: Array<A>
} {
  return RA.spanLeft_(as, predicate) as any
}

/**
 * Splits an array into two pieces, the first piece has `n` elements.
 *
 * @example
 * import { splitAt } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(splitAt(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4, 5]])
 */
export const splitAt: (
  n: number
) => <A>(as: Array<A>) => [Array<A>, Array<A>] = RA.splitAt as any

export const splitAt_: <A>(
  as: Array<A>,
  n: number
) => [Array<A>, Array<A>] = RA.splitAt_ as any

/**
 * Get all but the first element of an array, creating a new array, or `None` if the array is empty
 *
 * @example
 * import { tail } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(tail([1, 2, 3]), some([2, 3]))
 * assert.deepStrictEqual(tail([]), none)
 */
export const tail: <A>(as: Array<A>) => Option<Array<A>> = RA.tail as any

/**
 * Keep only a number of elements from the start of an array, creating a new array.
 * `n` must be a natural number
 *
 * @example
 * import { takeLeft } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(takeLeft(2)([1, 2, 3]), [1, 2])
 */
export const takeLeft: (n: number) => <A>(as: Array<A>) => Array<A> = RA.takeLeft as any

export const takeLeft_: <A>(as: Array<A>, n: number) => Array<A> = RA.takeLeft as any

/**
 * Calculate the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * @example
 * import { takeLeftWhile } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(takeLeftWhile((n: number) => n % 2 === 0)([2, 4, 3, 6]), [2, 4])
 */
export function takeLeftWhile<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Array<B>
export function takeLeftWhile<A>(predicate: Predicate<A>): (as: Array<A>) => Array<A>
export function takeLeftWhile<A>(predicate: Predicate<A>): (as: Array<A>) => Array<A> {
  return RA.takeLeftWhile(predicate) as any
}

export function takeLeftWhile_<A, B extends A>(
  as: Array<A>,
  refinement: Refinement<A, B>
): Array<B>
export function takeLeftWhile_<A>(as: Array<A>, predicate: Predicate<A>): Array<A>
export function takeLeftWhile_<A>(as: Array<A>, predicate: Predicate<A>): Array<A> {
  return RA.takeLeftWhile_(as, predicate) as any
}

/**
 * Keep only a number of elements from the end of an array, creating a new array.
 * `n` must be a natural number
 *
 * @example
 * import { takeRight } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(takeRight(2)([1, 2, 3, 4, 5]), [4, 5])
 */
export const takeRight: (
  n: number
) => <A>(as: Array<A>) => Array<A> = RA.takeRight as any

export const takeRight_: <A>(as: Array<A>, n: number) => Array<A> = RA.takeRight_ as any

export const traverse: CTraverse1<URI> = RA.traverse as any

export const traverse_: Traverse1<URI> = RA.traverse_ as any

export const traverseWithIndex: CTraverseWithIndex1<
  URI,
  number
> = RA.traverseWithIndex as any

export const traverseWithIndex_: TraverseWithIndex1<
  URI,
  number
> = RA.traverseWithIndex_ as any

export const unfold: <A, B>(b: B, f: (b: B) => Option<[A, B]>) => A[] = RA.unfold as any

/**
 * Creates an array of unique values, in order, from all given arrays using a `Eq` for equality comparisons
 *
 * @example
 * import { union } from '@matechs/core/Array'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.deepStrictEqual(union(eqNumber)([1, 2], [2, 3]), [1, 2, 3])
 */
export const union: <A>(
  E: Eq<A>
) => (xs: Array<A>, ys: Array<A>) => Array<A> = RA.union as any

/**
 * Remove duplicates from an array, keeping the first occurrence of an element.
 *
 * @example
 * import { uniq } from '@matechs/core/Array'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.deepStrictEqual(uniq(eqNumber)([1, 2, 1]), [1, 2])
 */
export const uniq: <A>(E: Eq<A>) => (as: Array<A>) => Array<A> = RA.uniq as any

export const uniq_: <A>(as: Array<A>, E: Eq<A>) => Array<A> = RA.uniq_ as any

export const unsafeDeleteAt_: <A>(
  as: Array<A>,
  i: number
) => Array<A> = RA.unsafeDeleteAt_ as any

export const unsafeDeleteAt: <A>(
  i: number
) => (as: Array<A>) => Array<A> = RA.unsafeDeleteAt as any

export const unsafeInsertAt_: <A>(
  as: Array<A>,
  i: number,
  a: A
) => Array<A> = RA.unsafeInsertAt_ as any

export const unsafeInsertAt: <A>(
  i: number,
  a: A
) => (as: Array<A>) => Array<A> = RA.unsafeInsertAt as any

export const unsafeUpdateAt_: <A>(
  as: Array<A>,
  i: number,
  a: A
) => Array<A> = RA.unsafeUpdateAt_ as any

export const unsafeUpdateAt: <A>(
  i: number,
  a: A
) => (as: Array<A>) => Array<A> = RA.unsafeUpdateAt as any

/**
 * The function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 *
 * @example
 * import { unzip } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(unzip([[1, 'a'], [2, 'b'], [3, 'c']]), [[1, 2, 3], ['a', 'b', 'c']])
 */
export const unzip: <A, B>(as: Array<[A, B]>) => [Array<A>, Array<B>] = RA.unzip as any

/**
 * Change the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { updateAt } from '@matechs/core/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(updateAt(1, 1)([1, 2, 3]), some([1, 1, 3]))
 * assert.deepStrictEqual(updateAt(1, 1)([]), none)
 */
export const updateAt: <A>(
  i: number,
  a: A
) => (as: Array<A>) => Option<Array<A>> = RA.updateAt as any

export const updateAt_: <A>(
  as: Array<A>,
  i: number,
  a: A
) => Option<Array<A>> = RA.updateAt_ as any

export const URI = "@matechs/core/Array"

export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: Array<A>
  }
}

export const wilt: CWilt1<URI> = RA.wilt as any

export const wilt_: Wilt1<URI> = RA.wilt_ as any

export const wither: CWither1<URI> = RA.wither as any

export const wither_: Wither1<URI> = RA.wither_ as any

export const zero: <A>() => A[] = RA.zero as any

/**
 * Takes two arrays and returns an array of corresponding pairs. If one input array is short, excess elements of the
 * longer array are discarded
 *
 * @example
 * import { zip } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(zip([1, 2, 3], ['a', 'b', 'c', 'd']), [[1, 'a'], [2, 'b'], [3, 'c']])
 */
export const zip_: <A, B>(fa: Array<A>, fb: Array<B>) => Array<[A, B]> = RA.zip_ as any

export const zip: <B>(
  fb: Array<B>
) => <A>(fa: Array<A>) => Array<[A, B]> = RA.zip_ as any

/**
 * Apply a function to pairs of elements at the same index in two arrays, collecting the results in a new array. If one
 * input array is short, excess elements of the longer array are discarded.
 *
 * @example
 * import { zipWith } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(zipWith([1, 2, 3], ['a', 'b', 'c', 'd'], (n, s) => s + n), ['a1', 'b2', 'c3'])
 */
export const zipWith_: <A, B, C>(
  fa: Array<A>,
  fb: Array<B>,
  f: (a: A, b: B) => C
) => Array<C> = RA.zipWith_ as any

export const zipWith: <A, B, C>(
  fb: Array<B>,
  f: (a: A, b: B) => C
) => (fa: Array<A>) => Array<C> = RA.zipWith as any

export const array: CMonad1<URI> &
  CFoldable1<URI> &
  CUnfoldable1<URI> &
  CTraversableWithIndex1<URI, number> &
  CAlternative1<URI> &
  CExtend1<URI> &
  CCompactable1<URI> &
  CFilterableWithIndex1<URI, number> &
  CWitherable1<URI> &
  CFunctorWithIndex1<URI, number> &
  CFoldableWithIndex1<URI, number> &
  CApplicative1<URI> = {
  URI,
  map,
  mapWithIndex,
  compact,
  separate,
  filter,
  filterMap,
  partition,
  partitionMap,
  of,
  ap,
  chain,
  reduce,
  foldMap,
  reduceRight,
  unfold,
  traverse,
  sequence,
  zero,
  alt,
  extend,
  wither,
  wilt,
  reduceWithIndex,
  foldMapWithIndex,
  reduceRightWithIndex,
  traverseWithIndex,
  partitionMapWithIndex,
  partitionWithIndex,
  filterMapWithIndex,
  filterWithIndex
}

export const arrayMonad: CMonad1<URI> & CApplicative1<URI> = {
  URI,
  map,
  of,
  ap,
  chain
}

export const arrayAp: CApplicative1<URI> = {
  URI,
  map,
  of,
  ap
}

export const arrayFoldable: CFoldable1<URI> = {
  URI,
  foldMap,
  reduce,
  reduceRight
}

export const Do = () => DoG(arrayMonad)

export const sequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(arrayAp))()

export const sequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(arrayAp))()
