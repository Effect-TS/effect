/* adapted from https://github.com/gcanti/fp-ts */

import * as AP from "../Apply"
import {
  CAlternative1,
  CApplicative,
  CApplicative1,
  CApply1,
  CCompactable1,
  CExtend1,
  CFilterable1,
  CFilterableWithIndex1,
  CFoldable1,
  CFoldableWithIndex1,
  CFunctorWithIndex1,
  CMonad1,
  CPartition1,
  CPartitionWithIndex1,
  CSequence1,
  CTraversable1,
  CTraversableWithIndex1,
  CTraverse1,
  CTraverseWithIndex1,
  CUnfoldable1,
  CWilt1,
  CWither1,
  CWitherable1,
  HKT,
  Partition1,
  PartitionWithIndex1,
  PredicateWithIndex,
  RefinementWithIndex,
  Separated,
  Traverse1,
  TraverseWithIndex1,
  Wilt1,
  Wither1,
  Monad1,
  Foldable1,
  Unfoldable1,
  TraversableWithIndex1,
  Alternative1,
  Extend1,
  Compactable1,
  Witherable1,
  FunctorWithIndex1,
  FoldableWithIndex1,
  Filterable1,
  Traversable1,
  Applicative1,
  FilterableWithIndex1,
  Applicative
} from "../Base"
import { Do as DoG } from "../Do"
import type { Either } from "../Either"
import type { Eq } from "../Eq"
import { flow } from "../Function"
import type { Predicate, Refinement } from "../Function"
import type { Monoid } from "../Monoid"
import { isSome, none, Option, some } from "../Option"
import { fromCompare, getMonoid as getOrdMonoid, Ord, ordNumber } from "../Ord"
import { ReadonlyNonEmptyArray } from "../Readonly/NonEmptyArray"
import type { Show } from "../Show"

export const alt: <A>(
  that: () => readonly A[]
) => (fa: readonly A[]) => readonly A[] = (that) => (fa) => concat(fa, that())

export const alt_: <A>(fa: readonly A[], that: () => readonly A[]) => readonly A[] = (
  fa,
  that
) => concat(fa, that())

export const ap = <A>(fa: readonly A[]) => <B>(
  fab: readonly ((a: A) => B)[]
): readonly B[] => flatten(map((f: (a: A) => B) => map(f)(fa))(fab))

export const ap_ = <A, B>(
  fab: readonly ((a: A) => B)[],
  fa: readonly A[]
): readonly B[] => flatten(map((f: (a: A) => B) => map(f)(fa))(fab))

export const apFirst = <B>(fb: readonly B[]) => <A>(fa: readonly A[]): readonly A[] =>
  ap(fb)(map((a: A) => () => a)(fa))

export const apFirst_ = <A, B>(fa: readonly A[], fb: readonly B[]): readonly A[] =>
  ap(fb)(map((a: A) => () => a)(fa))

export const apSecond = <B>(fb: readonly B[]) => <A>(fa: readonly A[]): readonly B[] =>
  ap(fb)(map(() => (b: B) => b)(fa))

export const apSecond_ = <A, B>(fa: readonly A[], fb: readonly B[]): readonly B[] =>
  ap(fb)(map(() => (b: B) => b)(fa))

export const chain: <A, B>(
  f: (a: A) => readonly B[]
) => (ma: readonly A[]) => readonly B[] = (f) => (fa) => {
  let resLen = 0
  const l = fa.length
  const temp = new Array(l)
  for (let i = 0; i < l; i++) {
    const e = fa[i]
    const arr = f(e)
    resLen += arr.length
    temp[i] = arr
  }
  const r = Array(resLen)
  let start = 0
  for (let i = 0; i < l; i++) {
    const arr = temp[i]
    const l = arr.length
    for (let j = 0; j < l; j++) {
      r[j + start] = arr[j]
    }
    start += l
  }
  return r
}

export const chain_: <A, B>(
  ma: readonly A[],
  f: (a: A) => readonly B[]
) => readonly B[] = (fa, f) => {
  let resLen = 0
  const l = fa.length
  const temp = new Array(l)
  for (let i = 0; i < l; i++) {
    const e = fa[i]
    const arr = f(e)
    resLen += arr.length
    temp[i] = arr
  }
  const r = Array(resLen)
  let start = 0
  for (let i = 0; i < l; i++) {
    const arr = temp[i]
    const l = arr.length
    for (let j = 0; j < l; j++) {
      r[j + start] = arr[j]
    }
    start += l
  }
  return r
}

export const chainTap: <A, B>(
  f: (a: A) => readonly B[]
) => (ma: readonly A[]) => readonly A[] = (f) => chain((a) => map(() => a)(f(a)))

export const chainTap_: <A, B>(
  ma: readonly A[],
  f: (a: A) => readonly B[]
) => readonly A[] = (ma, f) => chain_(ma, (a) => map(() => a)(f(a)))

/**
 * A useful recursion pattern for processing an array to produce a new array, often used for "chopping" up the input
 * array. Typically chop is called with some function that will consume an initial prefix of the array and produce a
 * value and the rest of the array.
 *
 * @example
 * import { Eq, eqNumber } from '@matechs/core/Eq'
 * import { chop, spanLeft } from '@matechs/core/Readonly/Array'
 *
 * const group = <A>(S: Eq<A>): ((as: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>>) => {
 *   return chop(as => {
 *     const { init, rest } = spanLeft((a: A) => S.equals(a, as[0]))(as)
 *     return [init, rest]
 *   })
 * }
 * assert.deepStrictEqual(group(eqNumber)([1, 1, 2, 3, 3, 4]), [[1, 1], [2], [3, 3], [4]])
 */
export function chop<A, B>(
  f: (as: ReadonlyNonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => {
    const result: Array<B> = []
    let cs: ReadonlyArray<A> = as
    while (isNonEmpty(cs)) {
      const [b, c] = f(cs)
      result.push(b)
      cs = c
    }
    return result
  }
}

export function chop_<A, B>(
  as: ReadonlyArray<A>,
  f: (as: ReadonlyNonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): ReadonlyArray<B> {
  const result: Array<B> = []
  let cs: ReadonlyArray<A> = as
  while (isNonEmpty(cs)) {
    const [b, c] = f(cs)
    result.push(b)
    cs = c
  }
  return result
}

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
 * import { chunksOf } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(chunksOf(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4], [5]])
 */
export function chunksOf(
  n: number
): <A>(as: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>> {
  const f = chop(splitAt(n))
  return (as) => (as.length === 0 ? empty : isOutOfBound(n - 1, as) ? [as] : f(as))
}

export function chunksOf_<A>(
  as: ReadonlyArray<A>,
  n: number
): ReadonlyArray<ReadonlyArray<A>> {
  const f = chop(splitAt(n))
  return as.length === 0 ? empty : isOutOfBound(n - 1, as) ? [as] : f(as)
}

export const compact = <A>(fa: readonly Option<A>[]): readonly A[] =>
  filterMap((x: Option<A>) => x)(fa)

/**
 * Array comprehension
 *
 * ```
 * [ f(x, y, ...) | x ← xs, y ← ys, ..., g(x, y, ...) ]
 * ```
 *
 * @example
 * import { comprehension } from '@matechs/core/Readonly/Array'
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
  input: readonly [
    ReadonlyArray<A>,
    ReadonlyArray<B>,
    ReadonlyArray<C>,
    ReadonlyArray<D>
  ],
  f: (a: A, b: B, c: C, d: D) => R,
  g?: (a: A, b: B, c: C, d: D) => boolean
): ReadonlyArray<R>
export function comprehension<A, B, C, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>, ReadonlyArray<C>],
  f: (a: A, b: B, c: C) => R,
  g?: (a: A, b: B, c: C) => boolean
): ReadonlyArray<R>
export function comprehension<A, R>(
  input: readonly [ReadonlyArray<A>],
  f: (a: A) => R,
  g?: (a: A) => boolean
): ReadonlyArray<R>
export function comprehension<A, B, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>],
  f: (a: A, b: B) => R,
  g?: (a: A, b: B) => boolean
): ReadonlyArray<R>
export function comprehension<A, R>(
  input: readonly [ReadonlyArray<A>],
  f: (a: A) => boolean,
  g?: (a: A) => R
): ReadonlyArray<R>
export function comprehension<R>(
  input: ReadonlyArray<ReadonlyArray<any>>,
  f: (...xs: ReadonlyArray<any>) => R,
  g: (...xs: ReadonlyArray<any>) => boolean = () => true
): ReadonlyArray<R> {
  const go = (
    scope: ReadonlyArray<any>,
    input: ReadonlyArray<ReadonlyArray<any>>
  ): ReadonlyArray<R> => {
    if (input.length === 0) {
      return g(...scope) ? [f(...scope)] : empty
    } else {
      return chain((x) => go(snoc_(scope, x), input.slice(1)))(input[0])
    }
  }
  return go(empty, input)
}

export const concat = <A>(
  x: ReadonlyArray<A>,
  y: ReadonlyArray<A>
): ReadonlyArray<A> => {
  const lenx = x.length
  if (lenx === 0) {
    return y
  }
  const leny = y.length
  if (leny === 0) {
    return x
  }
  const r = Array(lenx + leny)
  for (let i = 0; i < lenx; i++) {
    r[i] = x[i]
  }
  for (let i = 0; i < leny; i++) {
    r[i + lenx] = y[i]
  }
  return r
}

/**
 * Attaches an element to the front of an array, creating a new non empty array
 *
 * @example
 * import { cons } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(cons(0, [1, 2, 3]), [0, 1, 2, 3])
 */
export function cons_<A>(tail: ReadonlyArray<A>, head: A): ReadonlyNonEmptyArray<A> {
  const len = tail.length
  const r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    r[i + 1] = tail[i]
  }
  r[0] = head
  return (r as unknown) as ReadonlyNonEmptyArray<A>
}

export function cons<A>(head: A): (tail: ReadonlyArray<A>) => ReadonlyNonEmptyArray<A> {
  return (tail) => {
    const len = tail.length
    const r = Array(len + 1)
    for (let i = 0; i < len; i++) {
      r[i + 1] = tail[i]
    }
    r[0] = head
    return (r as unknown) as ReadonlyNonEmptyArray<A>
  }
}

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { deleteAt } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(deleteAt(0)([1, 2, 3]), some([2, 3]))
 * assert.deepStrictEqual(deleteAt(1)([]), none)
 */
export function deleteAt(
  i: number
): <A>(as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => (isOutOfBound(i, as) ? none : some(unsafeDeleteAt_(as, i)))
}

export function deleteAt_<A>(
  as: ReadonlyArray<A>,
  i: number
): Option<ReadonlyArray<A>> {
  return isOutOfBound(i, as) ? none : some(unsafeDeleteAt_(as, i))
}

/**
 * Creates an array of array values not included in the other given array using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 *
 * @example
 * import { difference } from '@matechs/core/Readonly/Array'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.deepStrictEqual(difference(eqNumber)([1, 2], [2, 3]), [1])
 */
export function difference<A>(
  E: Eq<A>
): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE = elem_(E)
  return (xs, ys) => xs.filter((a) => !elemE(ys, a))
}
/**
 * Drop a number of elements from the start of an array, creating a new array
 *
 * @example
 * import { dropLeft } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(dropLeft(2)([1, 2, 3]), [3])
 */
export function dropLeft(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => as.slice(n, as.length)
}

export function dropLeft_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return as.slice(n, as.length)
}

/**
 * Remove the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * @example
 * import { dropLeftWhile } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(dropLeftWhile((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), [2, 4, 5])
 */
export function dropLeftWhile<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    const i = spanIndex_(as, predicate)
    const l = as.length
    const rest = Array(l - i)
    for (let j = i; j < l; j++) {
      rest[j - i] = as[j]
    }
    return rest
  }
}

export function dropLeftWhile_<A>(
  as: ReadonlyArray<A>,
  predicate: Predicate<A>
): ReadonlyArray<A> {
  const i = spanIndex_(as, predicate)
  const l = as.length
  const rest = Array(l - i)
  for (let j = i; j < l; j++) {
    rest[j - i] = as[j]
  }
  return rest
}

/**
 * Drop a number of elements from the end of an array, creating a new array
 *
 * @example
 * import { dropRight } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(dropRight(2)([1, 2, 3, 4, 5]), [1, 2, 3])
 */
export function dropRight(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => as.slice(0, as.length - n)
}

export function dropRight_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return as.slice(0, as.length - n)
}

export const duplicate = <A>(ma: readonly A[]): readonly (readonly A[])[] =>
  extend((x: readonly A[]) => x)(ma)

/**
 * Test if a value is a member of an array. Takes a `Eq<A>` as a single
 * argument which returns the function to use to search for a value of type `A` in
 * an array of type `ReadonlyArray<A>`.
 *
 * @example
 * import { elem } from '@matechs/core/Readonly/Array'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.strictEqual(elem(eqNumber)(1, [1, 2, 3]), true)
 * assert.strictEqual(elem(eqNumber)(4, [1, 2, 3]), false)
 */
export function elem<A>(E: Eq<A>): (a: A) => (as: ReadonlyArray<A>) => boolean {
  return (a) => (as) => {
    const predicate = (element: A) => E.equals(element, a)
    let i = 0
    const len = as.length
    for (; i < len; i++) {
      if (predicate(as[i])) {
        return true
      }
    }
    return false
  }
}

export function elem_<A>(E: Eq<A>): (as: ReadonlyArray<A>, a: A) => boolean {
  return (as, a) => {
    const predicate = (element: A) => E.equals(element, a)
    let i = 0
    const len = as.length
    for (; i < len; i++) {
      if (predicate(as[i])) {
        return true
      }
    }
    return false
  }
}

/**
 * An empty array
 */
export const empty: ReadonlyArray<never> = []

export const extend: <A, B>(
  f: (fa: readonly A[]) => B
) => (ma: readonly A[]) => readonly B[] = (f) => (ma) =>
  ma.map((_, i, as) => f(as.slice(i)))

export const extend_: <A, B>(
  ma: readonly A[],
  f: (fa: readonly A[]) => B
) => readonly B[] = (ma, f) => ma.map((_, i, as) => f(as.slice(i)))

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (fa: readonly A[]) => readonly B[]
  <A>(predicate: Predicate<A>): (fa: readonly A[]) => readonly A[]
} = <A>(predicate: Predicate<A>) => (fa: readonly A[]): readonly A[] =>
  fa.filter(predicate)

export const filter_: {
  <A, B extends A>(fa: readonly A[], refinement: Refinement<A, B>): readonly B[]
  <A>(fa: readonly A[], predicate: Predicate<A>): readonly A[]
} = <A>(fa: readonly A[], predicate: Predicate<A>): readonly A[] => fa.filter(predicate)

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => (fa: readonly A[]) => readonly B[] = (f) => filterMapWithIndex((_, a) => f(a))

export const filterMap_: <A, B>(
  fa: readonly A[],
  f: (a: A) => Option<B>
) => readonly B[] = (fa, f) => filterMapWithIndex_(fa, (_, a) => f(a))

export const filterMapWithIndex = <A, B>(f: (i: number, a: A) => Option<B>) => (
  fa: readonly A[]
): readonly B[] => {
  const result: Array<B> = []
  for (let i = 0; i < fa.length; i++) {
    const optionB = f(i, fa[i])
    if (isSome(optionB)) {
      result.push(optionB.value)
    }
  }
  return result
}

export const filterMapWithIndex_ = <A, B>(
  fa: readonly A[],
  f: (i: number, a: A) => Option<B>
): readonly B[] => {
  const result: Array<B> = []
  for (let i = 0; i < fa.length; i++) {
    const optionB = f(i, fa[i])
    if (isSome(optionB)) {
      result.push(optionB.value)
    }
  }
  return result
}

export const filterWithIndex: {
  <A, B extends A>(refinementWithIndex: RefinementWithIndex<number, A, B>): (
    fa: readonly A[]
  ) => readonly B[]
  <A>(predicateWithIndex: PredicateWithIndex<number, A>): (
    fa: readonly A[]
  ) => readonly A[]
} = <A>(predicateWithIndex: PredicateWithIndex<number, A>) => (
  fa: readonly A[]
): readonly A[] => fa.filter((a, i) => predicateWithIndex(i, a))

export const filterWithIndex_: {
  <A, B extends A>(
    fa: readonly A[],
    refinementWithIndex: RefinementWithIndex<number, A, B>
  ): readonly B[]
  <A>(fa: readonly A[], predicateWithIndex: PredicateWithIndex<number, A>): readonly A[]
} = <A>(
  fa: readonly A[],
  predicateWithIndex: PredicateWithIndex<number, A>
): readonly A[] => fa.filter((a, i) => predicateWithIndex(i, a))

/**
 * Find the first element which satisfies a predicate (or a refinement) function
 *
 * @example
 * import { findFirst } from '@matechs/core/Readonly/Array'
 * import { some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(findFirst((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 1 }))
 */
export function findFirst<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => Option<B>
export function findFirst<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<A>
export function findFirst<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<A> {
  return (as) => {
    const len = as.length
    for (let i = 0; i < len; i++) {
      if (predicate(as[i])) {
        return some(as[i])
      }
    }
    return none
  }
}

export function findFirst_<A, B extends A>(
  as: ReadonlyArray<A>,
  refinement: Refinement<A, B>
): Option<B>
export function findFirst_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): Option<A>
export function findFirst_<A>(
  as: ReadonlyArray<A>,
  predicate: Predicate<A>
): Option<A> {
  const len = as.length
  for (let i = 0; i < len; i++) {
    if (predicate(as[i])) {
      return some(as[i])
    }
  }
  return none
}

/**
 * Find the first element returned by an option based selector function
 *
 * @example
 * import { findFirstMap } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * interface Person {
 *   name: string
 *   age?: number
 * }
 *
 * const persons: ReadonlyArray<Person> = [{ name: 'John' }, { name: 'Mary', age: 45 }, { name: 'Joey', age: 28 }]
 *
 * // returns the name of the first person that has an age
 * assert.deepStrictEqual(findFirstMap((p: Person) => (p.age === undefined ? none : some(p.name)))(persons), some('Mary'))
 */
export function findFirstMap<A, B>(
  f: (a: A) => Option<B>
): (as: ReadonlyArray<A>) => Option<B> {
  return (as) => {
    const len = as.length
    for (let i = 0; i < len; i++) {
      const v = f(as[i])
      if (isSome(v)) {
        return v
      }
    }
    return none
  }
}

export function findFirstMap_<A, B>(
  as: ReadonlyArray<A>,
  f: (a: A) => Option<B>
): Option<B> {
  const len = as.length
  for (let i = 0; i < len; i++) {
    const v = f(as[i])
    if (isSome(v)) {
      return v
    }
  }
  return none
}

/**
 * Find the first index for which a predicate holds
 *
 * @example
 * import { findIndex } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(findIndex((n: number) => n === 2)([1, 2, 3]), some(1))
 * assert.deepStrictEqual(findIndex((n: number) => n === 2)([]), none)
 */
export function findIndex<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<number> {
  return (as) => {
    const len = as.length
    for (let i = 0; i < len; i++) {
      if (predicate(as[i])) {
        return some(i)
      }
    }
    return none
  }
}

export function findIndex_<A>(
  as: ReadonlyArray<A>,
  predicate: Predicate<A>
): Option<number> {
  const len = as.length
  for (let i = 0; i < len; i++) {
    if (predicate(as[i])) {
      return some(i)
    }
  }
  return none
}

/**
 * Find the last element which satisfies a predicate function
 *
 * @example
 * import { findLast } from '@matechs/core/Readonly/Array'
 * import { some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(findLast((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 2 }))
 */
export function findLast<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => Option<B>
export function findLast<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<A>
export function findLast<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<A> {
  return (as) => {
    const len = as.length
    for (let i = len - 1; i >= 0; i--) {
      if (predicate(as[i])) {
        return some(as[i])
      }
    }
    return none
  }
}

export function findLast_<A, B extends A>(
  as: ReadonlyArray<A>,
  refinement: Refinement<A, B>
): Option<B>
export function findLast_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): Option<A>
export function findLast_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): Option<A> {
  const len = as.length
  for (let i = len - 1; i >= 0; i--) {
    if (predicate(as[i])) {
      return some(as[i])
    }
  }
  return none
}

/**
 * Returns the index of the last element of the list which matches the predicate
 *
 * @example
 * import { findLastIndex } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * interface X {
 *   a: number
 *   b: number
 * }
 * const xs: ReadonlyArray<X> = [{ a: 1, b: 0 }, { a: 1, b: 1 }]
 * assert.deepStrictEqual(findLastIndex((x: { a: number }) => x.a === 1)(xs), some(1))
 * assert.deepStrictEqual(findLastIndex((x: { a: number }) => x.a === 4)(xs), none)
 */
export function findLastIndex<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<number> {
  return (as) => {
    const len = as.length
    for (let i = len - 1; i >= 0; i--) {
      if (predicate(as[i])) {
        return some(i)
      }
    }
    return none
  }
}

export function findLastIndex_<A>(
  as: ReadonlyArray<A>,
  predicate: Predicate<A>
): Option<number> {
  const len = as.length
  for (let i = len - 1; i >= 0; i--) {
    if (predicate(as[i])) {
      return some(i)
    }
  }
  return none
}

/**
 * Find the last element returned by an option based selector function
 *
 * @example
 * import { findLastMap } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * interface Person {
 *   name: string
 *   age?: number
 * }
 *
 * const persons: ReadonlyArray<Person> = [{ name: 'John' }, { name: 'Mary', age: 45 }, { name: 'Joey', age: 28 }]
 *
 * // returns the name of the last person that has an age
 * assert.deepStrictEqual(findLastMap((p: Person) => (p.age === undefined ? none : some(p.name)))(persons), some('Joey'))
 */
export function findLastMap<A, B>(
  f: (a: A) => Option<B>
): (as: ReadonlyArray<A>) => Option<B> {
  return (as) => {
    const len = as.length
    for (let i = len - 1; i >= 0; i--) {
      const v = f(as[i])
      if (isSome(v)) {
        return v
      }
    }
    return none
  }
}

export function findLastMap_<A, B>(
  as: ReadonlyArray<A>,
  f: (a: A) => Option<B>
): Option<B> {
  const len = as.length
  for (let i = len - 1; i >= 0; i--) {
    const v = f(as[i])
    if (isSome(v)) {
      return v
    }
  }
  return none
}

/**
 * Removes one level of nesting
 *
 * @example
 * import { flatten } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(flatten([[1], [2], [3]]), [1, 2, 3])
 */
export function flatten<A>(mma: ReadonlyArray<ReadonlyArray<A>>): ReadonlyArray<A> {
  let rLen = 0
  const len = mma.length
  for (let i = 0; i < len; i++) {
    rLen += mma[i].length
  }
  const r = Array(rLen)
  let start = 0
  for (let i = 0; i < len; i++) {
    const arr = mma[i]
    const l = arr.length
    for (let j = 0; j < l; j++) {
      r[j + start] = arr[j]
    }
    start += l
  }
  return r
}

/**
 * Break an array into its first element and remaining elements
 *
 * @example
 * import { foldLeft } from '@matechs/core/Readonly/Array'
 *
 * const len: <A>(as: ReadonlyArray<A>) => number = foldLeft(() => 0, (_, tail) => 1 + len(tail))
 * assert.strictEqual(len([1, 2, 3]), 3)
 */
export function foldLeft<A, B>(
  onNil: () => B,
  onCons: (head: A, tail: ReadonlyArray<A>) => B
): (as: ReadonlyArray<A>) => B {
  return (as) => (isEmpty(as) ? onNil() : onCons(as[0], as.slice(1)))
}

export function foldLeft_<A, B>(
  as: ReadonlyArray<A>,
  onNil: () => B,
  onCons: (head: A, tail: ReadonlyArray<A>) => B
): B {
  return isEmpty(as) ? onNil() : onCons(as[0], as.slice(1))
}

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: readonly A[]) => M = (M) => (f) =>
  foldMapWithIndex(M)((_, a) => f(a))

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: readonly A[], f: (a: A) => M) => M = (M) => (fa, f) =>
  foldMapWithIndex_(M)(fa, (_, a) => f(a))

export const foldMapWithIndex: <M>(
  M: Monoid<M>
) => <A>(f: (i: number, a: A) => M) => (fa: readonly A[]) => M = (M) => (f) => (fa) =>
  fa.reduce((b, a, i) => M.concat(b, f(i, a)), M.empty)

export const foldMapWithIndex_: <M>(
  M: Monoid<M>
) => <A>(fa: readonly A[], f: (i: number, a: A) => M) => M = (M) => (fa, f) =>
  fa.reduce((b, a, i) => M.concat(b, f(i, a)), M.empty)

/**
 * Break an array into its initial elements and the last element
 */
export function foldRight<A, B>(
  onNil: () => B,
  onCons: (init: ReadonlyArray<A>, last: A) => B
): (as: ReadonlyArray<A>) => B {
  return (as) =>
    isEmpty(as) ? onNil() : onCons(as.slice(0, as.length - 1), as[as.length - 1])
}

export function foldRight_<A, B>(
  as: ReadonlyArray<A>,
  onNil: () => B,
  onCons: (init: ReadonlyArray<A>, last: A) => B
): B {
  return isEmpty(as) ? onNil() : onCons(as.slice(0, as.length - 1), as[as.length - 1])
}

export function fromArray<A>(as: Array<A>): ReadonlyArray<A> {
  const l = as.length
  if (l === 0) {
    return empty
  }
  const ras = Array(l)
  for (let i = 0; i < l; i++) {
    ras[i] = as[i]
  }
  return ras
}

/**
 * Derives an `Eq` over the `ReadonlyArray` of a given element type from the `Eq` of that type. The derived `Eq` defines two
 * arrays as equal if all elements of both arrays are compared equal pairwise with the given `E`. In case of arrays of
 * different lengths, the result is non equality.
 *
 * @example
 * import { eqString } from '@matechs/core/Eq'
 * import { getEq } from '@matechs/core/Readonly/Array'
 *
 * const E = getEq(eqString)
 * assert.strictEqual(E.equals(['a', 'b'], ['a', 'b']), true)
 * assert.strictEqual(E.equals(['a'], []), false)
 */
export function getEq<A>(E: Eq<A>): Eq<ReadonlyArray<A>> {
  return {
    equals: (xs, ys) =>
      xs === ys || (xs.length === ys.length && xs.every((x, i) => E.equals(x, ys[i])))
  }
}

/**
 * Returns a `Monoid` for `ReadonlyArray<A>`
 *
 * @example
 * import { getMonoid } from '@matechs/core/Readonly/Array'
 *
 * const M = getMonoid<number>()
 * assert.deepStrictEqual(M.concat([1, 2], [3, 4]), [1, 2, 3, 4])
 */
export function getMonoid<A = never>(): Monoid<ReadonlyArray<A>> {
  return {
    concat,
    empty
  }
}

/**
 * Derives an `Ord` over the `ReadonlyArray` of a given element type from the `Ord` of that type. The ordering between two such
 * arrays is equal to: the first non equal comparison of each arrays elements taken pairwise in increasing order, in
 * case of equality over all the pairwise elements; the longest array is considered the greatest, if both arrays have
 * the same length, the result is equality.
 *
 * @example
 * import { getOrd } from '@matechs/core/Readonly/Array'
 * import { ordString } from '@matechs/core/Ord'
 *
 * const O = getOrd(ordString)
 * assert.strictEqual(O.compare(['b'], ['a']), 1)
 * assert.strictEqual(O.compare(['a'], ['a']), 0)
 * assert.strictEqual(O.compare(['a'], ['b']), -1)
 */
export function getOrd<A>(O: Ord<A>): Ord<ReadonlyArray<A>> {
  return fromCompare((a, b) => {
    const aLen = a.length
    const bLen = b.length
    const len = Math.min(aLen, bLen)
    for (let i = 0; i < len; i++) {
      const ordering = O.compare(a[i], b[i])
      if (ordering !== 0) {
        return ordering
      }
    }
    return ordNumber.compare(aLen, bLen)
  })
}

export function getShow<A>(S: Show<A>): Show<ReadonlyArray<A>> {
  return {
    show: (as) => `[${as.map(S.show).join(", ")}]`
  }
}

/**
 * Get the first element in an array, or `None` if the array is empty
 *
 * @example
 * import { head } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(head([1, 2, 3]), some(1))
 * assert.deepStrictEqual(head([]), none)
 */
export function head<A>(as: ReadonlyArray<A>): Option<A> {
  return isEmpty(as) ? none : some(as[0])
}

/**
 * Get all but the last element of an array, creating a new array, or `None` if the array is empty
 *
 * @example
 * import { init } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(init([1, 2, 3]), some([1, 2]))
 * assert.deepStrictEqual(init([]), none)
 */
export function init<A>(as: ReadonlyArray<A>): Option<ReadonlyArray<A>> {
  const len = as.length
  return len === 0 ? none : some(as.slice(0, len - 1))
}

/**
 * Insert an element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { insertAt } from '@matechs/core/Readonly/Array'
 * import { some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(insertAt(2, 5)([1, 2, 3, 4]), some([1, 2, 5, 3, 4]))
 */
export function insertAt<A>(
  i: number,
  a: A
): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => (i < 0 || i > as.length ? none : some(unsafeInsertAt_(as, i, a)))
}

export function insertAt_<A>(
  as: ReadonlyArray<A>,
  i: number,
  a: A
): Option<ReadonlyArray<A>> {
  return i < 0 || i > as.length ? none : some(unsafeInsertAt_(as, i, a))
}

/**
 * Creates an array of unique values that are included in all given arrays using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 *
 * @example
 * import { intersection } from '@matechs/core/Readonly/Array'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.deepStrictEqual(intersection(eqNumber)([1, 2], [2, 3]), [2])
 */
export function intersection<A>(
  E: Eq<A>
): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE = elem_(E)
  return (xs, ys) => xs.filter((a) => elemE(ys, a))
}

/**
 * Test whether an array is empty
 *
 * @example
 * import { isEmpty } from '@matechs/core/Readonly/Array'
 *
 * assert.strictEqual(isEmpty([]), true)
 */
export function isEmpty<A>(as: ReadonlyArray<A>): boolean {
  return as.length === 0
}

/**
 * Test whether an array is non empty narrowing down the type to `NonEmptyReadonlyArray<A>`
 */
export function isNonEmpty<A>(as: ReadonlyArray<A>): as is ReadonlyNonEmptyArray<A> {
  return as.length > 0
}

/**
 * Test whether an array contains a particular index
 */
export function isOutOfBound<A>(i: number, as: ReadonlyArray<A>): boolean {
  return i < 0 || i >= as.length
}

/**
 * Get the last element in an array, or `None` if the array is empty
 *
 * @example
 * import { last } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(last([1, 2, 3]), some(3))
 * assert.deepStrictEqual(last([]), none)
 */
export function last<A>(as: ReadonlyArray<A>): Option<A> {
  return lookup_(as.length - 1, as)
}

/**
 * Extracts from an array of `Either` all the `Left` elements. All the `Left` elements are extracted in order
 *
 * @example
 * import { lefts } from '@matechs/core/Readonly/Array'
 * import { left, right } from '@matechs/core/Either'
 *
 * assert.deepStrictEqual(lefts([right(1), left('foo'), right(2)]), ['foo'])
 */
export function lefts<E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<E> {
  const r: Array<E> = []
  const len = as.length
  for (let i = 0; i < len; i++) {
    const a = as[i]
    if (a._tag === "Left") {
      r.push(a.left)
    }
  }
  return r
}

/**
 * This function provides a safe way to read a value at a particular index from an array
 *
 * @example
 * import { lookup } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(lookup(1, [1, 2, 3]), some(2))
 * assert.deepStrictEqual(lookup(3, [1, 2, 3]), none)
 */
export function lookup_<A>(i: number, as: ReadonlyArray<A>): Option<A> {
  return isOutOfBound(i, as) ? none : some(as[i])
}

export function lookup(i: number): <A>(as: ReadonlyArray<A>) => Option<A> {
  return (as) => (isOutOfBound(i, as) ? none : some(as[i]))
}

/**
 * Return a list of length `n` with element `i` initialized with `f(i)`
 *
 * @example
 * import { makeBy } from '@matechs/core/Readonly/Array'
 *
 * const double = (n: number): number => n * 2
 * assert.deepStrictEqual(makeBy(5, double), [0, 2, 4, 6, 8])
 */
export function makeBy<A>(n: number, f: (i: number) => A): ReadonlyArray<A> {
  const r: Array<A> = []
  for (let i = 0; i < n; i++) {
    r.push(f(i))
  }
  return r
}

export const map: <A, B>(f: (a: A) => B) => (fa: readonly A[]) => readonly B[] = (
  f
) => (fa) => fa.map((a) => f(a))

export const map_: <A, B>(fa: readonly A[], f: (a: A) => B) => readonly B[] = (fa, f) =>
  fa.map((a) => f(a))

export const mapWithIndex: <A, B>(
  f: (i: number, a: A) => B
) => (fa: readonly A[]) => readonly B[] = (f) => (fa) => fa.map((a, i) => f(i, a))

export const mapWithIndex_: <A, B>(
  fa: readonly A[],
  f: (i: number, a: A) => B
) => readonly B[] = (fa, f) => fa.map((a, i) => f(i, a))

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @example
 * import { modifyAt } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * const double = (x: number): number => x * 2
 * assert.deepStrictEqual(modifyAt(1, double)([1, 2, 3]), some([1, 4, 3]))
 * assert.deepStrictEqual(modifyAt(1, double)([]), none)
 */
export function modifyAt<A>(
  i: number,
  f: (a: A) => A
): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => (isOutOfBound(i, as) ? none : some(unsafeUpdateAt_(as, i, f(as[i]))))
}

export function modifyAt_<A>(
  as: ReadonlyArray<A>,
  i: number,
  f: (a: A) => A
): Option<ReadonlyArray<A>> {
  return isOutOfBound(i, as) ? none : some(unsafeUpdateAt_(as, i, f(as[i])))
}

export const of = <A>(a: A): ReadonlyArray<A> => [a]

export const partition: CPartition1<URI> = <A>(predicate: Predicate<A>) => (
  fa: readonly A[]
): Separated<readonly A[], readonly A[]> =>
  partitionWithIndex((_, a: A) => predicate(a))(fa)

export const partition_: Partition1<URI> = <A>(
  fa: readonly A[],
  predicate: Predicate<A>
): Separated<readonly A[], readonly A[]> =>
  partitionWithIndex((_, a: A) => predicate(a))(fa)

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (fa: readonly A[]) => Separated<readonly B[], readonly C[]> = (f) =>
  partitionMapWithIndex((_, a) => f(a))

export const partitionMap_: <A, B, C>(
  fa: readonly A[],
  f: (a: A) => Either<B, C>
) => Separated<readonly B[], readonly C[]> = (fa, f) =>
  partitionMapWithIndex_(fa, (_, a) => f(a))

export const partitionMapWithIndex = <A, B, C>(
  f: (i: number, a: A) => Either<B, C>
) => (fa: readonly A[]): Separated<readonly B[], readonly C[]> => {
  const left: Array<B> = []
  const right: Array<C> = []
  for (let i = 0; i < fa.length; i++) {
    const e = f(i, fa[i])
    if (e._tag === "Left") {
      left.push(e.left)
    } else {
      right.push(e.right)
    }
  }
  return {
    left,
    right
  }
}

export const partitionMapWithIndex_ = <A, B, C>(
  fa: readonly A[],
  f: (i: number, a: A) => Either<B, C>
): Separated<readonly B[], readonly C[]> => {
  const left: Array<B> = []
  const right: Array<C> = []
  for (let i = 0; i < fa.length; i++) {
    const e = f(i, fa[i])
    if (e._tag === "Left") {
      left.push(e.left)
    } else {
      right.push(e.right)
    }
  }
  return {
    left,
    right
  }
}

export const partitionWithIndex: CPartitionWithIndex1<URI, number> = <A>(
  predicateWithIndex: PredicateWithIndex<number, A>
) => (fa: readonly A[]): Separated<readonly A[], readonly A[]> => {
  const left: Array<A> = []
  const right: Array<A> = []
  for (let i = 0; i < fa.length; i++) {
    const a = fa[i]
    if (predicateWithIndex(i, a)) {
      right.push(a)
    } else {
      left.push(a)
    }
  }
  return {
    left,
    right
  }
}

export const partitionWithIndex_: PartitionWithIndex1<URI, number> = <A>(
  fa: readonly A[],
  predicateWithIndex: PredicateWithIndex<number, A>
): Separated<readonly A[], readonly A[]> => {
  const left: Array<A> = []
  const right: Array<A> = []
  for (let i = 0; i < fa.length; i++) {
    const a = fa[i]
    if (predicateWithIndex(i, a)) {
      right.push(a)
    } else {
      left.push(a)
    }
  }
  return {
    left,
    right
  }
}

/**
 * Create an array containing a range of integers, including both endpoints
 *
 * @example
 * import { range } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(range(1, 5), [1, 2, 3, 4, 5])
 */
export function range(start: number, end: number): ReadonlyArray<number> {
  return makeBy(end - start + 1, (i) => start + i)
}

export const reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: readonly A[]) => B = (
  b,
  f
) => reduceWithIndex(b, (_, b, a) => f(b, a))

export const reduce_: <A, B>(fa: readonly A[], b: B, f: (b: B, a: A) => B) => B = (
  fa,
  b,
  f
) => reduceWithIndex_(fa, b, (_, b, a) => f(b, a))

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: readonly A[]) => B = (b, f) => reduceRightWithIndex(b, (_, a, b) => f(a, b))

export const reduceRight_: <A, B>(fa: readonly A[], b: B, f: (a: A, b: B) => B) => B = (
  fa,
  b,
  f
) => reduceRightWithIndex_(fa, b, (_, a, b) => f(a, b))

export const reduceRightWithIndex: <A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
) => (fa: readonly A[]) => B = (b, f) => (fa) =>
  fa.reduceRight((b, a, i) => f(i, a, b), b)

export const reduceRightWithIndex_: <A, B>(
  fa: readonly A[],
  b: B,
  f: (i: number, a: A, b: B) => B
) => B = (fa, b, f) => fa.reduceRight((b, a, i) => f(i, a, b), b)

export const reduceWithIndex: <A, B>(
  b: B,
  f: (i: number, b: B, a: A) => B
) => (fa: readonly A[]) => B = (b, f) => (fa) => {
  const l = fa.length
  let r = b
  for (let i = 0; i < l; i++) {
    r = f(i, r, fa[i])
  }
  return r
}

export const reduceWithIndex_: <A, B>(
  fa: readonly A[],
  b: B,
  f: (i: number, b: B, a: A) => B
) => B = (fa, b, f) => {
  const l = fa.length
  let r = b
  for (let i = 0; i < l; i++) {
    r = f(i, r, fa[i])
  }
  return r
}

/**
 * Create an array containing a value repeated the specified number of times
 *
 * @example
 * import { replicate } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(replicate(3, 'a'), ['a', 'a', 'a'])
 */
export function replicate<A>(n: number, a: A): ReadonlyArray<A> {
  return makeBy(n, () => a)
}
/**
 * Reverse an array, creating a new array
 *
 * @example
 * import { reverse } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(reverse([1, 2, 3]), [3, 2, 1])
 */
export function reverse<A>(as: ReadonlyArray<A>): ReadonlyArray<A> {
  return [...as].reverse()
}

/**
 * Extracts from an array of `Either` all the `Right` elements. All the `Right` elements are extracted in order
 *
 * @example
 * import { rights } from '@matechs/core/Readonly/Array'
 * import { right, left } from '@matechs/core/Either'
 *
 * assert.deepStrictEqual(rights([right(1), left('foo'), right(2)]), [1, 2])
 */
export function rights<E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<A> {
  const r: Array<A> = []
  const len = as.length
  for (let i = 0; i < len; i++) {
    const a = as[i]
    if (a._tag === "Right") {
      r.push(a.right)
    }
  }
  return r
}

/**
 * Rotate an array to the right by `n` steps
 *
 * @example
 * import { rotate } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(rotate(2)([1, 2, 3, 4, 5]), [4, 5, 1, 2, 3])
 */
export function rotate(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    const len = as.length
    if (n === 0 || len <= 1 || len === Math.abs(n)) {
      return as
    } else if (n < 0) {
      return rotate(len + n)(as)
    } else {
      return as.slice(-n).concat(as.slice(0, len - n))
    }
  }
}

export function rotate_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  const len = as.length
  if (n === 0 || len <= 1 || len === Math.abs(n)) {
    return as
  } else if (n < 0) {
    return rotate(len + n)(as)
  } else {
    return as.slice(-n).concat(as.slice(0, len - n))
  }
}

/**
 * Same as `reduce` but it carries over the intermediate steps
 *
 * ```ts
 * import { scanLeft } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(scanLeft(10, (b, a: number) => b - a)([1, 2, 3]), [10, 9, 7, 4])
 * ```
 */
export function scanLeft<A, B>(
  b: B,
  f: (b: B, a: A) => B
): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => {
    const l = as.length
    const r: Array<B> = new Array(l + 1)
    r[0] = b
    for (let i = 0; i < l; i++) {
      r[i + 1] = f(r[i], as[i])
    }
    return r
  }
}

export function scanLeft_<A, B>(
  as: ReadonlyArray<A>,
  b: B,
  f: (b: B, a: A) => B
): ReadonlyArray<B> {
  const l = as.length
  const r: Array<B> = new Array(l + 1)
  r[0] = b
  for (let i = 0; i < l; i++) {
    r[i + 1] = f(r[i], as[i])
  }
  return r
}

/**
 * Fold an array from the right, keeping all intermediate results instead of only the final result
 *
 * @example
 * import { scanRight } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(scanRight(10, (a: number, b) => b - a)([1, 2, 3]), [4, 5, 7, 10])
 */
export function scanRight<A, B>(
  b: B,
  f: (a: A, b: B) => B
): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => {
    const l = as.length
    const r: Array<B> = new Array(l + 1)
    r[l] = b
    for (let i = l - 1; i >= 0; i--) {
      r[i] = f(as[i], r[i + 1])
    }
    return r
  }
}

export function scanRight_<A, B>(
  as: ReadonlyArray<A>,
  b: B,
  f: (a: A, b: B) => B
): ReadonlyArray<B> {
  const l = as.length
  const r: Array<B> = new Array(l + 1)
  r[l] = b
  for (let i = l - 1; i >= 0; i--) {
    r[i] = f(as[i], r[i + 1])
  }
  return r
}

export const separate = <B, C>(
  fa: ReadonlyArray<Either<B, C>>
): Separated<ReadonlyArray<B>, ReadonlyArray<C>> => {
  const left: Array<B> = []
  const right: Array<C> = []
  for (const e of fa) {
    if (e._tag === "Left") {
      left.push(e.left)
    } else {
      right.push(e.right)
    }
  }
  return {
    left,
    right
  }
}

export const sequence: CSequence1<URI> = <F>(F: CApplicative<F>) => <A>(
  ta: ReadonlyArray<HKT<F, A>>
): HKT<F, ReadonlyArray<A>> => {
  return reduce(F.of(zero<A>()), (fas, fa: HKT<F, A>) =>
    F.ap(fa)(F.map((as: readonly A[]) => (a: A) => snoc_(as, a))(fas))
  )(ta)
}

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @example
 * import { snoc } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(snoc([1, 2, 3], 4), [1, 2, 3, 4])
 */
export function snoc_<A>(init: ReadonlyArray<A>, end: A): ReadonlyNonEmptyArray<A> {
  const len = init.length
  const r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    r[i] = init[i]
  }
  r[len] = end
  return (r as unknown) as ReadonlyNonEmptyArray<A>
}

export function snoc<A>(end: A): (init: ReadonlyArray<A>) => ReadonlyNonEmptyArray<A> {
  return (init) => {
    const len = init.length
    const r = Array(len + 1)
    for (let i = 0; i < len; i++) {
      r[i] = init[i]
    }
    r[len] = end
    return (r as unknown) as ReadonlyNonEmptyArray<A>
  }
}

/**
 * Sort the elements of an array in increasing order, creating a new array
 *
 * @example
 * import { sort } from '@matechs/core/Readonly/Array'
 * import { ordNumber } from '@matechs/core/Ord'
 *
 * assert.deepStrictEqual(sort(ordNumber)([3, 2, 1]), [1, 2, 3])
 */
export function sort<A>(O: Ord<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => [...as].sort(O.compare)
}

export function sort_<A>(as: ReadonlyArray<A>, O: Ord<A>): ReadonlyArray<A> {
  return [...as].sort(O.compare)
}

/**
 * Sort the elements of an array in increasing order, where elements are compared using first `ords[0]`, then `ords[1]`,
 * etc...
 *
 * @example
 * import { sortBy } from '@matechs/core/Readonly/Array'
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
export function sortBy<A>(
  ords: ReadonlyArray<Ord<A>>
): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  const M = getOrdMonoid<A>()
  return sort(ords.reduce(M.concat, M.empty))
}

export function sortBy_<A>(
  as: ReadonlyArray<A>,
  ords: ReadonlyArray<Ord<A>>
): ReadonlyArray<A> {
  const M = getOrdMonoid<A>()
  return sort_(as, ords.reduce(M.concat, M.empty))
}

export const spanIndex_ = <A>(
  as: ReadonlyArray<A>,
  predicate: Predicate<A>
): number => {
  const l = as.length
  let i = 0
  for (; i < l; i++) {
    if (!predicate(as[i])) {
      break
    }
  }
  return i
}

/**
 * Split an array into two parts:
 * 1. the longest initial subarray for which all elements satisfy the specified predicate
 * 2. the remaining elements
 *
 * @example
 * import { spanLeft } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(spanLeft((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), { init: [1, 3], rest: [2, 4, 5] })
 */
export function spanLeft<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => Spanned<B, A>
export function spanLeft<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Spanned<A, A>
export function spanLeft<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Spanned<A, A> {
  return (as) => {
    const i = spanIndex_(as, predicate)
    const init = Array(i)
    for (let j = 0; j < i; j++) {
      init[j] = as[j]
    }
    const l = as.length
    const rest = Array(l - i)
    for (let j = i; j < l; j++) {
      rest[j - i] = as[j]
    }
    return { init, rest }
  }
}

export function spanLeft_<A, B extends A>(
  as: ReadonlyArray<A>,
  refinement: Refinement<A, B>
): Spanned<B, A>
export function spanLeft_<A>(
  as: ReadonlyArray<A>,
  predicate: Predicate<A>
): Spanned<A, A>
export function spanLeft_<A>(
  as: ReadonlyArray<A>,
  predicate: Predicate<A>
): Spanned<A, A> {
  const i = spanIndex_(as, predicate)
  const init = Array(i)
  for (let j = 0; j < i; j++) {
    init[j] = as[j]
  }
  const l = as.length
  const rest = Array(l - i)
  for (let j = i; j < l; j++) {
    rest[j - i] = as[j]
  }
  return { init, rest }
}

export interface Spanned<I, R> {
  readonly init: ReadonlyArray<I>
  readonly rest: ReadonlyArray<R>
}

/**
 * Splits an array into two pieces, the first piece has `n` elements.
 *
 * @example
 * import { splitAt } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(splitAt(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4, 5]])
 */
export function splitAt(
  n: number
): <A>(as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (as) => [as.slice(0, n), as.slice(n)]
}

export function splitAt_<A>(
  as: ReadonlyArray<A>,
  n: number
): readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return [as.slice(0, n), as.slice(n)]
}

/**
 * Get all but the first element of an array, creating a new array, or `None` if the array is empty
 *
 * @example
 * import { tail } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(tail([1, 2, 3]), some([2, 3]))
 * assert.deepStrictEqual(tail([]), none)
 */
export function tail<A>(as: ReadonlyArray<A>): Option<ReadonlyArray<A>> {
  return isEmpty(as) ? none : some(as.slice(1))
}

/**
 * Keep only a number of elements from the start of an array, creating a new array.
 * `n` must be a natural number
 *
 * @example
 * import { takeLeft } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(takeLeft(2)([1, 2, 3]), [1, 2])
 */
export function takeLeft(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => as.slice(0, n)
}

export function takeLeft_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return as.slice(0, n)
}

/**
 * Calculate the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * @example
 * import { takeLeftWhile } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(takeLeftWhile((n: number) => n % 2 === 0)([2, 4, 3, 6]), [2, 4])
 */
export function takeLeftWhile<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => ReadonlyArray<B>
export function takeLeftWhile<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => ReadonlyArray<A>
export function takeLeftWhile<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    const i = spanIndex_(as, predicate)
    const init = Array(i)
    for (let j = 0; j < i; j++) {
      init[j] = as[j]
    }
    return init
  }
}

export function takeLeftWhile_<A, B extends A>(
  as: ReadonlyArray<A>,
  refinement: Refinement<A, B>
): ReadonlyArray<B>
export function takeLeftWhile_<A>(
  as: ReadonlyArray<A>,
  predicate: Predicate<A>
): ReadonlyArray<A>
export function takeLeftWhile_<A>(
  as: ReadonlyArray<A>,
  predicate: Predicate<A>
): ReadonlyArray<A> {
  const i = spanIndex_(as, predicate)
  const init = Array(i)
  for (let j = 0; j < i; j++) {
    init[j] = as[j]
  }
  return init
}

/**
 * Keep only a number of elements from the end of an array, creating a new array.
 * `n` must be a natural number
 *
 * @example
 * import { takeRight } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(takeRight(2)([1, 2, 3, 4, 5]), [4, 5])
 */
export function takeRight(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => (n === 0 ? empty : as.slice(-n))
}

export function takeRight_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return n === 0 ? empty : as.slice(-n)
}

export function toArray<A>(ras: ReadonlyArray<A>): Array<A> {
  const l = ras.length
  const as = Array(l)
  for (let i = 0; i < l; i++) {
    as[i] = ras[i]
  }
  return as
}

export const traverse: CTraverse1<URI> = <F>(
  F: CApplicative<F>
): (<A, B>(
  f: (a: A) => HKT<F, B>
) => (ta: ReadonlyArray<A>) => HKT<F, ReadonlyArray<B>>) => {
  return (f) => traverseWithIndex(F)((_, a) => f(a))
}

export const traverse_: Traverse1<URI> = <F>(
  F: CApplicative<F>
): (<A, B>(
  ta: ReadonlyArray<A>,
  f: (a: A) => HKT<F, B>
) => HKT<F, ReadonlyArray<B>>) => {
  return (ta, f) => traverseWithIndex_(F)(ta, (_, a) => f(a))
}

export const traverseWithIndex: CTraverseWithIndex1<URI, number> = <F>(
  F: CApplicative<F>
) => <A, B>(f: (i: number, a: A) => HKT<F, B>) => (
  ta: ReadonlyArray<A>
): HKT<F, ReadonlyArray<B>> => {
  return reduceWithIndex_(ta, F.of<ReadonlyArray<B>>(zero()), (i, fbs, a: A) =>
    F.ap(f(i, a))(F.map((bs: readonly B[]) => (b: B) => snoc_(bs, b))(fbs))
  )
}

export const traverseWithIndex_: TraverseWithIndex1<URI, number> = <F>(
  F: CApplicative<F>
) => <A, B>(
  ta: ReadonlyArray<A>,
  f: (i: number, a: A) => HKT<F, B>
): HKT<F, ReadonlyArray<B>> => {
  return reduceWithIndex_(ta, F.of<ReadonlyArray<B>>(zero()), (i, fbs, a: A) =>
    F.ap(f(i, a))(F.map((bs: readonly B[]) => (b: B) => snoc_(bs, b))(fbs))
  )
}

export const unfold = <A, B>(
  b: B,
  f: (b: B) => Option<readonly [A, B]>
): ReadonlyArray<A> => {
  const ret: Array<A> = []
  let bb: B = b
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const mt = f(bb)
    if (isSome(mt)) {
      const [a, b] = mt.value
      ret.push(a)
      bb = b
    } else {
      break
    }
  }
  return ret
}

/**
 * Creates an array of unique values, in order, from all given arrays using a `Eq` for equality comparisons
 *
 * @example
 * import { union } from '@matechs/core/Readonly/Array'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.deepStrictEqual(union(eqNumber)([1, 2], [2, 3]), [1, 2, 3])
 */
export function union<A>(
  E: Eq<A>
): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE = elem_(E)
  return (xs, ys) =>
    concat(
      xs,
      ys.filter((a) => !elemE(xs, a))
    )
}

/**
 * Remove duplicates from an array, keeping the first occurrence of an element.
 *
 * @example
 * import { uniq } from '@matechs/core/Readonly/Array'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.deepStrictEqual(uniq(eqNumber)([1, 2, 1]), [1, 2])
 */
export function uniq<A>(E: Eq<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemS = elem_(E)
  return (as) => {
    const r: Array<A> = []
    const len = as.length
    let i = 0
    for (; i < len; i++) {
      const a = as[i]
      if (!elemS(r, a)) {
        r.push(a)
      }
    }
    return len === r.length ? as : r
  }
}

export function uniq_<A>(as: ReadonlyArray<A>, E: Eq<A>): ReadonlyArray<A> {
  const elemS = elem_(E)
  const r: Array<A> = []
  const len = as.length
  let i = 0
  for (; i < len; i++) {
    const a = as[i]
    if (!elemS(r, a)) {
      r.push(a)
    }
  }
  return len === r.length ? as : r
}

export function unsafeDeleteAt_<A>(as: ReadonlyArray<A>, i: number): ReadonlyArray<A> {
  const xs = [...as]
  xs.splice(i, 1)
  return xs
}

export function unsafeDeleteAt(
  i: number
): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    const xs = [...as]
    xs.splice(i, 1)
    return xs
  }
}

export function unsafeInsertAt_<A>(
  as: ReadonlyArray<A>,
  i: number,
  a: A
): ReadonlyArray<A> {
  const xs = [...as]
  xs.splice(i, 0, a)
  return xs
}

export function unsafeInsertAt<A>(
  i: number,
  a: A
): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    const xs = [...as]
    xs.splice(i, 0, a)
    return xs
  }
}

export function unsafeUpdateAt_<A>(
  as: ReadonlyArray<A>,
  i: number,
  a: A
): ReadonlyArray<A> {
  if (as[i] === a) {
    return as
  } else {
    const xs = [...as]
    xs[i] = a
    return xs
  }
}

export function unsafeUpdateAt<A>(
  i: number,
  a: A
): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    if (as[i] === a) {
      return as
    } else {
      const xs = [...as]
      xs[i] = a
      return xs
    }
  }
}

/**
 * The function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 *
 * @example
 * import { unzip } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(unzip([[1, 'a'], [2, 'b'], [3, 'c']]), [[1, 2, 3], ['a', 'b', 'c']])
 */
export function unzip<A, B>(
  as: ReadonlyArray<readonly [A, B]>
): readonly [ReadonlyArray<A>, ReadonlyArray<B>] {
  const fa: Array<A> = []
  const fb: Array<B> = []
  for (let i = 0; i < as.length; i++) {
    fa[i] = as[i][0]
    fb[i] = as[i][1]
  }
  return [fa, fb]
}

/**
 * Change the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { updateAt } from '@matechs/core/Readonly/Array'
 * import { some, none } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(updateAt(1, 1)([1, 2, 3]), some([1, 1, 3]))
 * assert.deepStrictEqual(updateAt(1, 1)([]), none)
 */
export function updateAt<A>(
  i: number,
  a: A
): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => (isOutOfBound(i, as) ? none : some(unsafeUpdateAt_(as, i, a)))
}

export function updateAt_<A>(
  as: ReadonlyArray<A>,
  i: number,
  a: A
): Option<ReadonlyArray<A>> {
  return isOutOfBound(i, as) ? none : some(unsafeUpdateAt_(as, i, a))
}

export const URI = "@matechs/core/Readonly/Array"

export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: ReadonlyArray<A>
  }
}

export const wilt: CWilt1<URI> = <F>(
  F: CApplicative<F>
): (<A, B, C>(
  f: (a: A) => HKT<F, Either<B, C>>
) => (
  wa: ReadonlyArray<A>
) => HKT<F, Separated<ReadonlyArray<B>, ReadonlyArray<C>>>) => {
  const traverseF = traverse(F)
  return (f) => flow(traverseF(f), F.map(separate))
}

export const wilt_: Wilt1<URI> = <F>(
  F: CApplicative<F>
): (<A, B, C>(
  wa: ReadonlyArray<A>,
  f: (a: A) => HKT<F, Either<B, C>>
) => HKT<F, Separated<ReadonlyArray<B>, ReadonlyArray<C>>>) => {
  const traverseF = traverse_(F)
  return (wa, f) => F.map(separate)(traverseF(wa, f))
}

export const wither: CWither1<URI> = <F>(
  F: CApplicative<F>
): (<A, B>(
  f: (a: A) => HKT<F, Option<B>>
) => (ta: ReadonlyArray<A>) => HKT<F, ReadonlyArray<B>>) => {
  const traverseF = traverse(F)
  return (f) => flow(traverseF(f), F.map(compact))
}

export const wither_: Wither1<URI> = <F>(
  F: CApplicative<F>
): (<A, B>(
  ta: ReadonlyArray<A>,
  f: (a: A) => HKT<F, Option<B>>
) => HKT<F, ReadonlyArray<B>>) => {
  const traverseF = traverse(F)
  return (ta, f) => flow(traverseF(f), F.map(compact))(ta)
}

export const zero: <A>() => readonly A[] = () => empty

/**
 * Takes two arrays and returns an array of corresponding pairs. If one input array is short, excess elements of the
 * longer array are discarded
 *
 * @example
 * import { zip } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(zip([1, 2, 3], ['a', 'b', 'c', 'd']), [[1, 'a'], [2, 'b'], [3, 'c']])
 */
export function zip<A, B>(
  fb: ReadonlyArray<B>
): (fa: ReadonlyArray<A>) => ReadonlyArray<readonly [A, B]> {
  return zipWith(fb, (a, b) => [a, b])
}

export function zip_<A, B>(
  fa: ReadonlyArray<A>,
  fb: ReadonlyArray<B>
): ReadonlyArray<readonly [A, B]> {
  return zipWith_(fa, fb, (a, b) => [a, b])
}

/**
 * Apply a function to pairs of elements at the same index in two arrays, collecting the results in a new array. If one
 * input array is short, excess elements of the longer array are discarded.
 *
 * @example
 * import { zipWith } from '@matechs/core/Readonly/Array'
 *
 * assert.deepStrictEqual(zipWith([1, 2, 3], ['a', 'b', 'c', 'd'], (n, s) => s + n), ['a1', 'b2', 'c3'])
 */
export function zipWith_<A, B, C>(
  fa: ReadonlyArray<A>,
  fb: ReadonlyArray<B>,
  f: (a: A, b: B) => C
): ReadonlyArray<C> {
  const fc: Array<C> = []
  const len = Math.min(fa.length, fb.length)
  for (let i = 0; i < len; i++) {
    fc[i] = f(fa[i], fb[i])
  }
  return fc
}

export function zipWith<A, B, C>(
  fb: ReadonlyArray<B>,
  f: (a: A, b: B) => C
): (fa: ReadonlyArray<A>) => ReadonlyArray<C> {
  return (fa) => {
    const fc: Array<C> = []
    const len = Math.min(fa.length, fb.length)
    for (let i = 0; i < len; i++) {
      fc[i] = f(fa[i], fb[i])
    }
    return fc
  }
}

export const applyArray: CApply1<URI> = {
  URI,
  map,
  ap
}

export const applicativeArray: CApplicative1<URI> = {
  URI,
  map,
  ap,
  of
}

export const monadArray: CMonad1<URI> & CApplicative1<URI> = {
  URI,
  map,
  of,
  ap,
  chain
}

export const foldableArray: CFoldable1<URI> = {
  URI,
  foldMap,
  reduce,
  reduceRight
}

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
  CFilterable1<URI> &
  CTraversable1<URI> &
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

export const Do = () => DoG(monadArray)

export const sequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(applicativeArray))()

export const sequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(applicativeArray))()

//
// Compatibility with fp-ts ecosystem
//

const traverseWithIndex__ = <F>(F: Applicative<F>) => <A, B>(
  ta: ReadonlyArray<A>,
  f: (i: number, a: A) => HKT<F, B>
): HKT<F, ReadonlyArray<B>> => {
  return reduceWithIndex_(ta, F.of<ReadonlyArray<B>>(zero()), (i, fbs, a: A) =>
    F.ap(
      F.map(fbs, (bs: readonly B[]) => (b: B) => snoc_(bs, b)),
      f(i, a)
    )
  )
}

const traverse__ = <F>(
  F: Applicative<F>
): (<A, B>(
  ta: ReadonlyArray<A>,
  f: (a: A) => HKT<F, B>
) => HKT<F, ReadonlyArray<B>>) => {
  return (ta, f) => traverseWithIndex__(F)(ta, (_, a) => f(a))
}

export const array_: Monad1<URI> &
  Foldable1<URI> &
  Unfoldable1<URI> &
  TraversableWithIndex1<URI, number> &
  Alternative1<URI> &
  Extend1<URI> &
  Compactable1<URI> &
  FilterableWithIndex1<URI, number> &
  Witherable1<URI> &
  FunctorWithIndex1<URI, number> &
  FoldableWithIndex1<URI, number> &
  Filterable1<URI> &
  Traversable1<URI> &
  Applicative1<URI> = {
  URI,
  map: map_,
  mapWithIndex: mapWithIndex_,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_,
  of,
  ap: ap_,
  chain: chain_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  unfold,
  traverse: traverse__,
  sequence: <F>(F: Applicative<F>) => <A>(
    ta: ReadonlyArray<HKT<F, A>>
  ): HKT<F, ReadonlyArray<A>> => {
    return reduce(F.of(zero<A>()), (fas, fa: HKT<F, A>) =>
      F.ap(
        F.map(fas, (as: readonly A[]) => (a: A) => snoc_(as, a)),
        fa
      )
    )(ta)
  },
  zero,
  alt: alt_,
  extend: extend_,
  wither: <F>(
    F: Applicative<F>
  ): (<A, B>(
    ta: ReadonlyArray<A>,
    f: (a: A) => HKT<F, Option<B>>
  ) => HKT<F, ReadonlyArray<B>>) => {
    const traverseF = traverse__(F)
    return (ta, f) => F.map(traverseF(ta, f), compact)
  },
  wilt: <F>(
    F: Applicative<F>
  ): (<A, B, C>(
    wa: ReadonlyArray<A>,
    f: (a: A) => HKT<F, Either<B, C>>
  ) => HKT<F, Separated<ReadonlyArray<B>, ReadonlyArray<C>>>) => {
    const traverseF = traverse__(F)
    return (wa, f) => F.map(traverseF(wa, f), separate)
  },
  reduceWithIndex: reduceWithIndex_,
  foldMapWithIndex: foldMapWithIndex_,
  reduceRightWithIndex: reduceRightWithIndex_,
  traverseWithIndex: traverseWithIndex__,
  partitionMapWithIndex: partitionMapWithIndex_,
  partitionWithIndex: partitionWithIndex_,
  filterMapWithIndex: filterMapWithIndex_,
  filterWithIndex: filterWithIndex_
}
