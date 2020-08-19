/* adapted from https://github.com/gcanti/fp-ts */

import type { Either } from "../Either/core"
import type { Predicate, Refinement } from "../Function/core"
import { MutableArray } from "../Mutable"
import { NonEmptyArray } from "../NonEmptyArray"
import { isSome, none, Option, some } from "../Option"
import { Separated } from "../Utils"

export type Array<A> = ReadonlyArray<A>

/**
 * Classic Applicative's ap
 */
export const ap = <A>(fa: readonly A[]) => <B>(
  fab: readonly ((a: A) => B)[]
): readonly B[] => ap_(fab, fa)

/**
 * Classic Applicative's ap
 */
export const ap_ = <A, B>(
  fab: readonly ((a: A) => B)[],
  fa: readonly A[]
): readonly B[] => flatten(map((f: (a: A) => B) => map(f)(fa))(fab))

/**
 * Composes computations in sequence, using the return value of one computation to determine the next computation.
 */
export const chain: <A, B>(
  f: (a: A) => readonly B[]
) => (ma: readonly A[]) => readonly B[] = (f) => (fa) => chain_(fa, f)

/**
 * Composes computations in sequence, using the return value of one computation to determine the next computation.
 */
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

/**
 * Like chain but ignores output
 */
export const tap: <A>(
  f: (a: A) => readonly any[]
) => (ma: readonly A[]) => readonly A[] = (f) => chain((a) => map(() => a)(f(a)))

/**
 * Like chain but ignores output
 */
export const tap_: <A, B>(
  ma: readonly A[],
  f: (a: A) => readonly B[]
) => readonly A[] = (ma, f) => chain_(ma, (a) => map(() => a)(f(a)))

/**
 * A useful recursion pattern for processing an array to produce a new array, often used for "chopping" up the input
 * array. Typically chop is called with some function that will consume an initial prefix of the array and produce a
 * value and the rest of the array.
 */
export function chop<A, B>(
  f: (as: NonEmptyArray<A>) => readonly [B, Array<A>]
): (as: Array<A>) => Array<B> {
  return (as) => chop_(as, f)
}

/**
 * A useful recursion pattern for processing an array to produce a new array, often used for "chopping" up the input
 * array. Typically chop is called with some function that will consume an initial prefix of the array and produce a
 * value and the rest of the array.
 */
export function chop_<A, B>(
  as: Array<A>,
  f: (as: NonEmptyArray<A>) => readonly [B, Array<A>]
): Array<B> {
  const result: MutableArray<B> = []
  let cs: Array<A> = as
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
 */
export function chunksOf(n: number): <A>(as: Array<A>) => Array<Array<A>> {
  return (as) => chunksOf_(as, n)
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
 */
export function chunksOf_<A>(as: Array<A>, n: number): Array<Array<A>> {
  const f = chop(splitAt(n))
  return as.length === 0 ? empty : isOutOfBound(n - 1, as) ? [as] : f(as)
}

/**
 * Filter out optional values
 */
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
 * assert.deepStrictEqual(comprehension([[1, 2, 3], ['a', 'b']], tuple, (a, b) => (a + b.length) % 2 === 0), [
 *   [1, 'a'],
 *   [1, 'b'],
 *   [3, 'a'],
 *   [3, 'b']
 * ])
 */
export function comprehension<A, B, C, D, R>(
  input: readonly [Array<A>, Array<B>, Array<C>, Array<D>],
  f: (a: A, b: B, c: C, d: D) => R,
  g?: (a: A, b: B, c: C, d: D) => boolean
): Array<R>
export function comprehension<A, B, C, R>(
  input: readonly [Array<A>, Array<B>, Array<C>],
  f: (a: A, b: B, c: C) => R,
  g?: (a: A, b: B, c: C) => boolean
): Array<R>
export function comprehension<A, R>(
  input: readonly [Array<A>],
  f: (a: A) => R,
  g?: (a: A) => boolean
): Array<R>
export function comprehension<A, B, R>(
  input: readonly [Array<A>, Array<B>],
  f: (a: A, b: B) => R,
  g?: (a: A, b: B) => boolean
): Array<R>
export function comprehension<A, R>(
  input: readonly [Array<A>],
  f: (a: A) => boolean,
  g?: (a: A) => R
): Array<R>
export function comprehension<R>(
  input: Array<Array<any>>,
  f: (...xs: Array<any>) => R,
  g: (...xs: Array<any>) => boolean = () => true
): Array<R> {
  const go = (scope: Array<any>, input: Array<Array<any>>): Array<R> => {
    if (input.length === 0) {
      return g(...scope) ? [f(...scope)] : empty
    } else {
      return chain((x) => go(snoc_(scope, x), input.slice(1)))(input[0])
    }
  }
  return go(empty, input)
}

/**
 * Concatenate
 */
export const concat_ = <A>(x: Array<A>, y: Array<A>): Array<A> => {
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
 * Concatenate
 */
export const concat = <A>(y: Array<A>): ((x: Array<A>) => Array<A>) => {
  return (x) => concat_(x, y)
}

/**
 * Attaches an element to the front of an array, creating a new non empty array
 *
 * @example
 * assert.deepStrictEqual(cons(0, [1, 2, 3]), [0, 1, 2, 3])
 */
export function cons_<A>(tail: Array<A>, head: A): NonEmptyArray<A> {
  const len = tail.length
  const r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    r[i + 1] = tail[i]
  }
  r[0] = head
  return (r as unknown) as NonEmptyArray<A>
}

/**
 * Attaches an element to the front of an array, creating a new non empty array
 */
export function cons<A>(head: A): (tail: Array<A>) => NonEmptyArray<A> {
  return (tail) => cons_(tail, head)
}

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * assert.deepStrictEqual(deleteAt(0)([1, 2, 3]), some([2, 3]))
 * assert.deepStrictEqual(deleteAt(1)([]), none)
 */
export function deleteAt(i: number): <A>(as: Array<A>) => Option<Array<A>> {
  return (as) => (isOutOfBound(i, as) ? none : some(unsafeDeleteAt_(as, i)))
}

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 */
export function deleteAt_<A>(as: Array<A>, i: number): Option<Array<A>> {
  return isOutOfBound(i, as) ? none : some(unsafeDeleteAt_(as, i))
}

/**
 * Drop a number of elements from the start of an array, creating a new array
 *
 * @example
 * assert.deepStrictEqual(dropLeft(2)([1, 2, 3]), [3])
 */
export function dropLeft(n: number): <A>(as: Array<A>) => Array<A> {
  return (as) => as.slice(n, as.length)
}

/**
 * Drop a number of elements from the start of an array, creating a new array
 */
export function dropLeft_<A>(as: Array<A>, n: number): Array<A> {
  return as.slice(n, as.length)
}

/**
 * Remove the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * @example
 * assert.deepStrictEqual(dropLeftWhile((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), [2, 4, 5])
 */
export function dropLeftWhile<A>(predicate: Predicate<A>): (as: Array<A>) => Array<A> {
  return (as) => dropLeftWhile_(as, predicate)
}

/**
 * Remove the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * @example
 * assert.deepStrictEqual(dropLeftWhile((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), [2, 4, 5])
 */
export function dropLeftWhile_<A>(as: Array<A>, predicate: Predicate<A>): Array<A> {
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
 * assert.deepStrictEqual(dropRight(2)([1, 2, 3, 4, 5]), [1, 2, 3])
 */
export function dropRight(n: number): <A>(as: Array<A>) => Array<A> {
  return (as) => as.slice(0, as.length - n)
}

/**
 * Drop a number of elements from the end of an array, creating a new array
 *
 * @example
 * assert.deepStrictEqual(dropRight(2)([1, 2, 3, 4, 5]), [1, 2, 3])
 */
export function dropRight_<A>(as: Array<A>, n: number): Array<A> {
  return as.slice(0, as.length - n)
}

/**
 * Array[A] => Array[Array[A]]
 */
export const duplicate = <A>(ma: readonly A[]): readonly (readonly A[])[] =>
  extend((x: readonly A[]) => x)(ma)

/**
 * An empty array
 */
export const empty: Array<never> = []

/**
 * Extends calls f with all the progressive slices up to the current element's index,
 * and uses the return value to construct the result array
 *
 * i.e: like map that also consumes all the elements up to `i`
 */
export const extend: <A, B>(
  f: (fa: readonly A[]) => B
) => (ma: readonly A[]) => readonly B[] = (f) => (ma) =>
  ma.map((_, i, as) => f(as.slice(i)))

/**
 * Extends calls f with all the progressive slices up to the current element's index,
 * and uses the return value to construct the result array
 *
 * i.e: like map that also consumes all the elements up to `i`
 */
export const extend_: <A, B>(
  ma: readonly A[],
  f: (fa: readonly A[]) => B
) => readonly B[] = (ma, f) => ma.map((_, i, as) => f(as.slice(i)))

/**
 * Filters the array
 */
export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (fa: readonly A[]) => readonly B[]
  <A>(predicate: Predicate<A>): (fa: readonly A[]) => readonly A[]
} = <A>(predicate: Predicate<A>) => (fa: readonly A[]): readonly A[] =>
  fa.filter(predicate)

/**
 * Filters the array
 */
export const filter_: {
  <A, B extends A>(fa: readonly A[], refinement: Refinement<A, B>): readonly B[]
  <A>(fa: readonly A[], predicate: Predicate<A>): readonly A[]
} = <A>(fa: readonly A[], predicate: Predicate<A>): readonly A[] => fa.filter(predicate)

/**
 * Filters the array also passing element index
 */
export function filterWithIndex<A>(
  predicate: (i: number, a: A) => boolean
): (nea: Array<A>) => Array<A> {
  return (nea) => nea.filter((a, i) => predicate(i, a))
}

/**
 * Filters the array also passing element index
 */
export function filterWithIndex_<A>(
  nea: NonEmptyArray<A>,
  predicate: (i: number, a: A) => boolean
): Array<A> {
  return nea.filter((a, i) => predicate(i, a))
}

/**
 * Filters the array also mapping the output
 */
export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => (fa: readonly A[]) => readonly B[] = (f) => filterMapWithIndex((_, a) => f(a))

/**
 * Filters the array also mapping the output
 */
export const filterMap_: <A, B>(
  fa: readonly A[],
  f: (a: A) => Option<B>
) => readonly B[] = (fa, f) => filterMapWithIndex_(fa, (_, a) => f(a))

/**
 * Filters the array also mapping the output
 */
export const filterMapWithIndex = <A, B>(f: (i: number, a: A) => Option<B>) => (
  fa: readonly A[]
): readonly B[] => filterMapWithIndex_(fa, f)

/**
 * Filters the array also mapping the output
 */
export const filterMapWithIndex_ = <A, B>(
  fa: readonly A[],
  f: (i: number, a: A) => Option<B>
): readonly B[] => {
  const result: MutableArray<B> = []
  for (let i = 0; i < fa.length; i++) {
    const optionB = f(i, fa[i])
    if (isSome(optionB)) {
      result.push(optionB.value)
    }
  }
  return result
}

/**
 * Find the first element which satisfies a predicate (or a refinement) function
 *
 * @example
 * assert.deepStrictEqual(findFirst((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 1 }))
 */
export function findFirst<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Option<B>
export function findFirst<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A>
export function findFirst<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A> {
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

/**
 * Find the first element which satisfies a predicate (or a refinement) function
 */
export function findFirst_<A, B extends A>(
  as: Array<A>,
  refinement: Refinement<A, B>
): Option<B>
export function findFirst_<A>(as: Array<A>, predicate: Predicate<A>): Option<A>
export function findFirst_<A>(as: Array<A>, predicate: Predicate<A>): Option<A> {
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
export function findFirstMap<A, B>(
  f: (a: A) => Option<B>
): (as: Array<A>) => Option<B> {
  return (as) => findFirstMap_(as, f)
}

/**
 * Find the first element returned by an option based selector function
 */
export function findFirstMap_<A, B>(as: Array<A>, f: (a: A) => Option<B>): Option<B> {
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
 * assert.deepStrictEqual(findIndex((n: number) => n === 2)([1, 2, 3]), some(1))
 * assert.deepStrictEqual(findIndex((n: number) => n === 2)([]), none)
 */
export function findIndex<A>(
  predicate: Predicate<A>
): (as: Array<A>) => Option<number> {
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

/**
 * Find the first index for which a predicate holds
 */
export function findIndex_<A>(as: Array<A>, predicate: Predicate<A>): Option<number> {
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
 * assert.deepStrictEqual(findLast((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 2 }))
 */
export function findLast<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Option<B>
export function findLast<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A>
export function findLast<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A> {
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

/**
 * Find the last element which satisfies a predicate function
 */
export function findLast_<A, B extends A>(
  as: Array<A>,
  refinement: Refinement<A, B>
): Option<B>
export function findLast_<A>(as: Array<A>, predicate: Predicate<A>): Option<A>
export function findLast_<A>(as: Array<A>, predicate: Predicate<A>): Option<A> {
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
 * interface X {
 *   a: number
 *   b: number
 * }
 * const xs: Array<X> = [{ a: 1, b: 0 }, { a: 1, b: 1 }]
 * assert.deepStrictEqual(findLastIndex((x: { a: number }) => x.a === 1)(xs), some(1))
 * assert.deepStrictEqual(findLastIndex((x: { a: number }) => x.a === 4)(xs), none)
 */
export function findLastIndex<A>(
  predicate: Predicate<A>
): (as: Array<A>) => Option<number> {
  return (as) => findLastIndex_(as, predicate)
}

/**
 * Returns the index of the last element of the list which matches the predicate
 */
export function findLastIndex_<A>(
  as: Array<A>,
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
export function findLastMap<A, B>(f: (a: A) => Option<B>): (as: Array<A>) => Option<B> {
  return (as) => findLastMap_(as, f)
}

/**
 * Find the last element returned by an option based selector function
 */
export function findLastMap_<A, B>(as: Array<A>, f: (a: A) => Option<B>): Option<B> {
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
 * assert.deepStrictEqual(flatten([[1], [2], [3]]), [1, 2, 3])
 */
export function flatten<A>(mma: Array<Array<A>>): Array<A> {
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
 * const len: <A>(as: Array<A>) => number = foldLeft(() => 0, (_, tail) => 1 + len(tail))
 * assert.strictEqual(len([1, 2, 3]), 3)
 */
export function foldLeft<A, B>(
  onNil: () => B,
  onCons: (head: A, tail: Array<A>) => B
): (as: Array<A>) => B {
  return (as) => (isEmpty(as) ? onNil() : onCons(as[0], as.slice(1)))
}

/**
 * Break an array into its first element and remaining elements
 */
export function foldLeft_<A, B>(
  as: Array<A>,
  onNil: () => B,
  onCons: (head: A, tail: Array<A>) => B
): B {
  return isEmpty(as) ? onNil() : onCons(as[0], as.slice(1))
}

/**
 * Break an array into its initial elements and the last element
 */
export function foldRight<A, B>(
  onNil: () => B,
  onCons: (init: Array<A>, last: A) => B
): (as: Array<A>) => B {
  return (as) =>
    isEmpty(as) ? onNil() : onCons(as.slice(0, as.length - 1), as[as.length - 1])
}

/**
 * Break an array into its initial elements and the last element
 */
export function foldRight_<A, B>(
  as: Array<A>,
  onNil: () => B,
  onCons: (init: Array<A>, last: A) => B
): B {
  return isEmpty(as) ? onNil() : onCons(as.slice(0, as.length - 1), as[as.length - 1])
}

/**
 * Copies a mutable array into an immutable
 */
export function fromMutable<A>(as: MutableArray<A>): Array<A> {
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
 * Get the first element in an array, or `None` if the array is empty
 *
 * @example
 * assert.deepStrictEqual(head([1, 2, 3]), some(1))
 * assert.deepStrictEqual(head([]), none)
 */
export function head<A>(as: Array<A>): Option<A> {
  return isEmpty(as) ? none : some(as[0])
}

/**
 * Get all but the last element of an array, creating a new array, or `None` if the array is empty
 *
 * @example
 * assert.deepStrictEqual(init([1, 2, 3]), some([1, 2]))
 * assert.deepStrictEqual(init([]), none)
 */
export function init<A>(as: Array<A>): Option<Array<A>> {
  const len = as.length
  return len === 0 ? none : some(as.slice(0, len - 1))
}

/**
 * Insert an element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * assert.deepStrictEqual(insertAt(2, 5)([1, 2, 3, 4]), some([1, 2, 5, 3, 4]))
 */
export function insertAt<A>(i: number, a: A): (as: Array<A>) => Option<Array<A>> {
  return (as) => (i < 0 || i > as.length ? none : some(unsafeInsertAt_(as, i, a)))
}

/**
 * Insert an element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 */
export function insertAt_<A>(as: Array<A>, i: number, a: A): Option<Array<A>> {
  return i < 0 || i > as.length ? none : some(unsafeInsertAt_(as, i, a))
}

/**
 * Test whether an array is empty
 *
 * @example
 * assert.strictEqual(isEmpty([]), true)
 */
export function isEmpty<A>(as: Array<A>): boolean {
  return as.length === 0
}

/**
 * Test whether an array is non empty narrowing down the type to `NonEmptyArray<A>`
 */
export function isNonEmpty<A>(as: Array<A>): as is NonEmptyArray<A> {
  return as.length > 0
}

/**
 * Test whether an array contains a particular index
 */
export function isOutOfBound<A>(i: number, as: Array<A>): boolean {
  return i < 0 || i >= as.length
}

/**
 * Get the last element in an array, or `None` if the array is empty
 *
 * @example
 * assert.deepStrictEqual(last([1, 2, 3]), some(3))
 * assert.deepStrictEqual(last([]), none)
 */
export function last<A>(as: Array<A>): Option<A> {
  return lookup_(as.length - 1, as)
}

/**
 * Extracts from an array of `Either` all the `Left` elements. All the `Left` elements are extracted in order
 *
 * @example
 * assert.deepStrictEqual(lefts([right(1), left('foo'), right(2)]), ['foo'])
 */
export function lefts<E, A>(as: Array<Either<E, A>>): Array<E> {
  const r: MutableArray<E> = []
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
 * assert.deepStrictEqual(lookup(1, [1, 2, 3]), some(2))
 * assert.deepStrictEqual(lookup(3, [1, 2, 3]), none)
 */
export function lookup_<A>(i: number, as: Array<A>): Option<A> {
  return isOutOfBound(i, as) ? none : some(as[i])
}

/**
 * This function provides a safe way to read a value at a particular index from an array
 */
export function lookup(i: number): <A>(as: Array<A>) => Option<A> {
  return (as) => (isOutOfBound(i, as) ? none : some(as[i]))
}

/**
 * Return a list of length `n` with element `i` initialized with `f(i)`
 *
 * @example
 * const double = (n: number): number => n * 2
 * assert.deepStrictEqual(makeBy_(5, double), [0, 2, 4, 6, 8])
 */
export function makeBy_<A>(n: number, f: (i: number) => A): Array<A> {
  const r: MutableArray<A> = []
  for (let i = 0; i < n; i++) {
    r.push(f(i))
  }
  return r
}

/**
 * Return a list of length `n` with element `i` initialized with `f(i)`
 */
export function makeBy<A>(f: (i: number) => A): (n: number) => Array<A> {
  return (n) => makeBy_(n, f)
}

/**
 * Apply f to every element of Array<A> returning Array<B>
 */
export const map: <A, B>(f: (a: A) => B) => (fa: readonly A[]) => readonly B[] = (
  f
) => (fa) => fa.map((a) => f(a))

/**
 * Apply f to every element of Array<A> returning Array<B>
 */
export const map_: <A, B>(fa: readonly A[], f: (a: A) => B) => readonly B[] = (fa, f) =>
  fa.map((a) => f(a))

/**
 * Like map but also passes the index to f
 */
export const mapWithIndex: <A, B>(
  f: (i: number, a: A) => B
) => (fa: readonly A[]) => readonly B[] = (f) => (fa) => mapWithIndex_(fa, f)

/**
 * Like map but also passes the index to f
 */
export const mapWithIndex_: <A, B>(
  fa: readonly A[],
  f: (i: number, a: A) => B
) => readonly B[] = (fa, f) => fa.map((a, i) => f(i, a))

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @example
 * const double = (x: number): number => x * 2
 * assert.deepStrictEqual(modifyAt(1, double)([1, 2, 3]), some([1, 4, 3]))
 * assert.deepStrictEqual(modifyAt(1, double)([]), none)
 */
export function modifyAt<A>(
  i: number,
  f: (a: A) => A
): (as: Array<A>) => Option<Array<A>> {
  return (as) => (isOutOfBound(i, as) ? none : some(unsafeUpdateAt_(as, i, f(as[i]))))
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 */
export function modifyAt_<A>(
  as: Array<A>,
  i: number,
  f: (a: A) => A
): Option<Array<A>> {
  return isOutOfBound(i, as) ? none : some(unsafeUpdateAt_(as, i, f(as[i])))
}

/**
 * Construct an array with a single element
 */
export const single = <A>(a: A): Array<A> => [a]

/**
 * Create an array containing a range of integers, including both endpoints
 *
 * @example
 * assert.deepStrictEqual(range(1, 5), [1, 2, 3, 4, 5])
 */
export function range(start: number, end: number): Array<number> {
  return makeBy_(end - start + 1, (i) => start + i)
}

/**
 * Construct B by compacting with f over the array from left to right
 */
export const reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: readonly A[]) => B = (
  b,
  f
) => reduceWithIndex(b, (_, b, a) => f(b, a))

/**
 * Construct B by compacting with f over the array from left to right
 */
export const reduce_: <A, B>(fa: readonly A[], b: B, f: (b: B, a: A) => B) => B = (
  fa,
  b,
  f
) => reduceWithIndex_(fa, b, (_, b, a) => f(b, a))

/**
 * Construct B by compacting with f over the array from right to left
 */
export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: readonly A[]) => B = (b, f) => reduceRightWithIndex(b, (_, a, b) => f(a, b))

/**
 * Construct B by compacting with f over the array from right to left
 */
export const reduceRight_: <A, B>(fa: readonly A[], b: B, f: (a: A, b: B) => B) => B = (
  fa,
  b,
  f
) => reduceRightWithIndex_(fa, b, (_, a, b) => f(a, b))

/**
 * Construct B by compacting with f over the array from right to left
 */
export const reduceRightWithIndex: <A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
) => (fa: readonly A[]) => B = (b, f) => (fa) =>
  fa.reduceRight((b, a, i) => f(i, a, b), b)

/**
 * Construct B by compacting with f over the array from right to left
 */
export const reduceRightWithIndex_: <A, B>(
  fa: readonly A[],
  b: B,
  f: (i: number, a: A, b: B) => B
) => B = (fa, b, f) => fa.reduceRight((b, a, i) => f(i, a, b), b)

/**
 * Construct B by compacting with f over the array from left to right
 */
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

/**
 * Construct B by compacting with f over the array from left to right
 */
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
 * assert.deepStrictEqual(replicate_(3, 'a'), ['a', 'a', 'a'])
 */
export function replicate_<A>(n: number, a: A): Array<A> {
  return makeBy_(n, () => a)
}

/**
 * Create an array containing a value repeated the specified number of times
 * assert.deepStrictEqual(replicate_(3, 'a'), ['a', 'a', 'a'])
 */
export function replicate<A>(a: A): (n: number) => Array<A> {
  return (n) => replicate_(n, a)
}

/**
 * Reverse an array, creating a new array
 *
 * @example
 * assert.deepStrictEqual(reverse([1, 2, 3]), [3, 2, 1])
 */
export function reverse<A>(as: Array<A>): Array<A> {
  return [...as].reverse()
}

/**
 * Extracts from an array of `Either` all the `Right` elements. All the `Right` elements are extracted in order
 *
 * @example
 * assert.deepStrictEqual(rights([right(1), left('foo'), right(2)]), [1, 2])
 */
export function rights<E, A>(as: Array<Either<E, A>>): Array<A> {
  const r: MutableArray<A> = []
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
 * assert.deepStrictEqual(rotate(2)([1, 2, 3, 4, 5]), [4, 5, 1, 2, 3])
 */
export function rotate(n: number): <A>(as: Array<A>) => Array<A> {
  return (as) => rotate_(as, n)
}

/**
 * Rotate an array to the right by `n` steps
 */
export function rotate_<A>(as: Array<A>, n: number): Array<A> {
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
 * import { scanLeft } from '@matechs/core/Array'
 *
 * assert.deepStrictEqual(scanLeft(10, (b, a: number) => b - a)([1, 2, 3]), [10, 9, 7, 4])
 * ```
 */
export function scanLeft<A, B>(b: B, f: (b: B, a: A) => B): (as: Array<A>) => Array<B> {
  return (as) => scanLeft_(as, b, f)
}

/**
 * Same as `reduce` but it carries over the intermediate steps
 */
export function scanLeft_<A, B>(as: Array<A>, b: B, f: (b: B, a: A) => B): Array<B> {
  const l = as.length
  const r: MutableArray<B> = new Array(l + 1)
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
 * assert.deepStrictEqual(scanRight(10, (a: number, b) => b - a)([1, 2, 3]), [4, 5, 7, 10])
 */
export function scanRight<A, B>(
  b: B,
  f: (a: A, b: B) => B
): (as: Array<A>) => Array<B> {
  return (as) => scanRight_(as, b, f)
}

/**
 * Fold an array from the right, keeping all intermediate results instead of only the final result
 */
export function scanRight_<A, B>(as: Array<A>, b: B, f: (a: A, b: B) => B): Array<B> {
  const l = as.length
  const r: MutableArray<B> = new Array(l + 1)
  r[l] = b
  for (let i = l - 1; i >= 0; i--) {
    r[i] = f(as[i], r[i + 1])
  }
  return r
}

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @example
 * assert.deepStrictEqual(snoc([1, 2, 3], 4), [1, 2, 3, 4])
 */
export function snoc_<A>(init: Array<A>, end: A): NonEmptyArray<A> {
  const len = init.length
  const r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    r[i] = init[i]
  }
  r[len] = end
  return (r as unknown) as NonEmptyArray<A>
}

/**
 * Append an element to the end of an array, creating a new non empty array
 */
export function snoc<A>(end: A): (init: Array<A>) => NonEmptyArray<A> {
  return (init) => snoc_(init, end)
}

/**
 * Finds the first index that doesn't satisfy predicate or the length of as
 */
export const spanIndex_ = <A>(as: Array<A>, predicate: Predicate<A>): number => {
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
 * assert.deepStrictEqual(spanLeft((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), { init: [1, 3], rest: [2, 4, 5] })
 */
export function spanLeft<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Spanned<B, A>
export function spanLeft<A>(predicate: Predicate<A>): (as: Array<A>) => Spanned<A, A>
export function spanLeft<A>(predicate: Predicate<A>): (as: Array<A>) => Spanned<A, A> {
  return (as) => spanLeft_(as, predicate)
}

/**
 * Split an array into two parts:
 * 1. the longest initial subarray for which all elements satisfy the specified predicate
 * 2. the remaining elements
 */
export function spanLeft_<A, B extends A>(
  as: Array<A>,
  refinement: Refinement<A, B>
): Spanned<B, A>
export function spanLeft_<A>(as: Array<A>, predicate: Predicate<A>): Spanned<A, A>
export function spanLeft_<A>(as: Array<A>, predicate: Predicate<A>): Spanned<A, A> {
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
  readonly init: Array<I>
  readonly rest: Array<R>
}

/**
 * Splits an array into two pieces, the first piece has `n` elements.
 *
 * @example
 * assert.deepStrictEqual(splitAt(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4, 5]])
 */
export function splitAt(n: number): <A>(as: Array<A>) => readonly [Array<A>, Array<A>] {
  return (as) => [as.slice(0, n), as.slice(n)]
}

/**
 * Splits an array into two pieces, the first piece has `n` elements.
 */
export function splitAt_<A>(as: Array<A>, n: number): readonly [Array<A>, Array<A>] {
  return [as.slice(0, n), as.slice(n)]
}

/**
 * Get all but the first element of an array, creating a new array, or `None` if the array is empty
 *
 * @example
 * assert.deepStrictEqual(tail([1, 2, 3]), some([2, 3]))
 * assert.deepStrictEqual(tail([]), none)
 */
export function tail<A>(as: Array<A>): Option<Array<A>> {
  return isEmpty(as) ? none : some(as.slice(1))
}

/**
 * Keep only a number of elements from the start of an array, creating a new array.
 * `n` must be a natural number
 *
 * @example
 * assert.deepStrictEqual(takeLeft(2)([1, 2, 3]), [1, 2])
 */
export function takeLeft(n: number): <A>(as: Array<A>) => Array<A> {
  return (as) => as.slice(0, n)
}

/**
 * Keep only a number of elements from the start of an array, creating a new array.
 * `n` must be a natural number
 */
export function takeLeft_<A>(as: Array<A>, n: number): Array<A> {
  return as.slice(0, n)
}

/**
 * Calculate the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * @example
 * assert.deepStrictEqual(takeLeftWhile((n: number) => n % 2 === 0)([2, 4, 3, 6]), [2, 4])
 */
export function takeLeftWhile<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Array<B>
export function takeLeftWhile<A>(predicate: Predicate<A>): (as: Array<A>) => Array<A>
export function takeLeftWhile<A>(predicate: Predicate<A>): (as: Array<A>) => Array<A> {
  return (as) => takeLeftWhile_(as, predicate)
}

/**
 * Calculate the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 */
export function takeLeftWhile_<A, B extends A>(
  as: Array<A>,
  refinement: Refinement<A, B>
): Array<B>
export function takeLeftWhile_<A>(as: Array<A>, predicate: Predicate<A>): Array<A>
export function takeLeftWhile_<A>(as: Array<A>, predicate: Predicate<A>): Array<A> {
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
 * assert.deepStrictEqual(takeRight(2)([1, 2, 3, 4, 5]), [4, 5])
 */
export function takeRight(n: number): <A>(as: Array<A>) => Array<A> {
  return (as) => (n === 0 ? empty : as.slice(-n))
}

/**
 * Keep only a number of elements from the end of an array, creating a new array.
 * `n` must be a natural number
 */
export function takeRight_<A>(as: Array<A>, n: number): Array<A> {
  return n === 0 ? empty : as.slice(-n)
}

/**
 * Copies this array into a mutable one
 */
export function toMutable<A>(ras: Array<A>): MutableArray<A> {
  const l = ras.length
  const as = Array(l)
  for (let i = 0; i < l; i++) {
    as[i] = ras[i]
  }
  return as
}

/**
 * Construct A by unfolding B signaling end with an option
 */
export const unfold_ = <A, B>(b: B, f: (b: B) => Option<readonly [A, B]>): Array<A> => {
  const ret: MutableArray<A> = []
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
 * Construct A by unfolding B signaling end with an option
 */
export const unfold = <A, B>(f: (b: B) => Option<readonly [A, B]>) => (b: B) =>
  unfold_(b, f)

/**
 * Deletes index i (non safe)
 */
export function unsafeDeleteAt_<A>(as: Array<A>, i: number): Array<A> {
  const xs = [...as]
  xs.splice(i, 1)
  return xs
}

/**
 * Deletes index i (non safe)
 */
export function unsafeDeleteAt(i: number): <A>(as: Array<A>) => Array<A> {
  return (as) => unsafeDeleteAt_(as, i)
}

/**
 * Inserts index i (non safe)
 */
export function unsafeInsertAt_<A>(as: Array<A>, i: number, a: A): Array<A> {
  const xs = [...as]
  xs.splice(i, 0, a)
  return xs
}

/**
 * Inserts index i (non safe)
 */
export function unsafeInsertAt<A>(i: number, a: A): (as: Array<A>) => Array<A> {
  return (as) => unsafeInsertAt_(as, i, a)
}

/**
 * Updates index i (non safe)
 */
export function unsafeUpdateAt_<A>(as: Array<A>, i: number, a: A): Array<A> {
  if (as[i] === a) {
    return as
  } else {
    const xs = [...as]
    xs[i] = a
    return xs
  }
}

/**
 * Updates index i (non safe)
 */
export function unsafeUpdateAt<A>(i: number, a: A): (as: Array<A>) => Array<A> {
  return (as) => unsafeUpdateAt_(as, i, a)
}

/**
 * The function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 *
 * @example
 * assert.deepStrictEqual(unzip([[1, 'a'], [2, 'b'], [3, 'c']]), [[1, 2, 3], ['a', 'b', 'c']])
 */
export function unzip<A, B>(as: Array<readonly [A, B]>): readonly [Array<A>, Array<B>] {
  const fa: MutableArray<A> = []
  const fb: MutableArray<B> = []
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
 * assert.deepStrictEqual(updateAt(1, 1)([1, 2, 3]), some([1, 1, 3]))
 * assert.deepStrictEqual(updateAt(1, 1)([]), none)
 */
export function updateAt<A>(i: number, a: A): (as: Array<A>) => Option<Array<A>> {
  return (as) => (isOutOfBound(i, as) ? none : some(unsafeUpdateAt_(as, i, a)))
}

/**
 * Change the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 */
export function updateAt_<A>(as: Array<A>, i: number, a: A): Option<Array<A>> {
  return isOutOfBound(i, as) ? none : some(unsafeUpdateAt_(as, i, a))
}

/**
 * Takes two arrays and returns an array of corresponding pairs. If one input array is short, excess elements of the
 * longer array are discarded
 *
 * @example
 * assert.deepStrictEqual(zip([1, 2, 3], ['a', 'b', 'c', 'd']), [[1, 'a'], [2, 'b'], [3, 'c']])
 */
export function zip<B>(fb: Array<B>): <A>(fa: Array<A>) => Array<readonly [A, B]> {
  return zipWith(fb, (a, b) => [a, b])
}

/**
 * Takes two arrays and returns an array of corresponding pairs. If one input array is short, excess elements of the
 * longer array are discarded
 */
export function zip_<A, B>(fa: Array<A>, fb: Array<B>): Array<readonly [A, B]> {
  return zipWith_(fa, fb, (a, b) => [a, b])
}

/**
 * Apply a function to pairs of elements at the same index in two arrays, collecting the results in a new array. If one
 * input array is short, excess elements of the longer array are discarded.
 *
 * @example
 * assert.deepStrictEqual(zipWith([1, 2, 3], ['a', 'b', 'c', 'd'], (n, s) => s + n), ['a1', 'b2', 'c3'])
 */
export function zipWith_<A, B, C>(
  fa: Array<A>,
  fb: Array<B>,
  f: (a: A, b: B) => C
): Array<C> {
  const fc: MutableArray<C> = []
  const len = Math.min(fa.length, fb.length)
  for (let i = 0; i < len; i++) {
    fc[i] = f(fa[i], fb[i])
  }
  return fc
}

/**
 * Apply a function to pairs of elements at the same index in two arrays, collecting the results in a new array. If one
 * input array is short, excess elements of the longer array are discarded.
 */
export function zipWith<A, B, C>(
  fb: Array<B>,
  f: (a: A, b: B) => C
): (fa: Array<A>) => Array<C> {
  return (fa) => zipWith_(fa, fb, f)
}

/**
 * Separate Array
 */
export const separate = <B, C>(
  fa: Array<Either<B, C>>
): Separated<Array<B>, Array<C>> => {
  const left: MutableArray<B> = []
  const right: MutableArray<C> = []
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
