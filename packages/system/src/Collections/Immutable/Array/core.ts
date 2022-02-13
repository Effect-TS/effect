// ets_tracing: off

/**
 * adapted from https://github.com/gcanti/fp-ts
 */
import "../../../Operator/index.js"

import type { Predicate, Refinement } from "../../../Function/core.js"
import { identity } from "../../../Function/core.js"
import type { Option } from "../../../Option/index.js"
import { isSome, none, some } from "../../../Option/index.js"
import type { MutableArray } from "../../../Support/Mutable/index.js"
import type { NonEmptyArray } from "../NonEmptyArray/index.js"
import * as Tp from "../Tuple/index.js"

export type Array<A> = ReadonlyArray<A>

/**
 * Composes computations in sequence, using the return value of one computation to determine the next computation.
 *
 * @ets_data_first chain_
 */
export function chain<A, B>(f: (a: A) => Array<B>) {
  return (ma: Array<A>): Array<B> => chain_(ma, f)
}

/**
 * Composes computations in sequence, using the return value of one computation to determine the next computation.
 */
export function chain_<A, B>(fa: Array<A>, f: (a: A) => Array<B>): Array<B> {
  let resLen = 0
  const l = fa.length
  const temp = new Array(l)
  for (let i = 0; i < l; i++) {
    const e = fa[i]!
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
 * Splits an array into length-`n` pieces. The last piece will be shorter if `n` does not evenly divide the length of
 * the array. Note that `split(n)([])` is `[]`, not `[[]]`. This is intentional, and is consistent with a recursive
 * definition of `split`; it satisfies the property that
 *
 * ```ts
 * split(n)(xs).concat(split(n)(ys)) == split(n)(xs.concat(ys)))
 * ```
 *
 * whenever `n` evenly divides the length of `xs`.
 *
 * @ets_data_first split_
 */
export function split(n: number): <A>(as: Array<A>) => Array<Array<A>> {
  return (as) => split_(as, n)
}

/**
 * Splits an array into length-`n` pieces. The last piece will be shorter if `n` does not evenly divide the length of
 * the array. Note that `split(n)([])` is `[]`, not `[[]]`. This is intentional, and is consistent with a recursive
 * definition of `split`; it satisfies the property that
 *
 * ```ts
 * split(n)(xs).concat(split(n)(ys)) == split(n)(xs.concat(ys)))
 * ```
 *
 * whenever `n` evenly divides the length of `xs`.
 */
export function split_<A>(as: Array<A>, n: number): Array<Array<A>> {
  const f = chop(splitAt(n))
  return as.length === 0 ? empty<Array<A>>() : isOutOfBound(n - 1, as) ? [as] : f(as)
}

/**
 * Filter out optional values
 */
export function compact<A>(fa: Array<Option<A>>): Array<A> {
  return collect((x: Option<A>) => x)(fa)
}

/**
 * Concatenate
 */
export function concat_<A, A1>(x: Array<A>, y: Array<A1>): Array<A | A1> {
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
 *
 * @ets_data_first concat_
 */
export function concat<A1>(y: Array<A1>) {
  return <A>(x: Array<A>): Array<A | A1> => concat_(x, y)
}

/**
 * Attaches an element to the front of an array, creating a new non empty array
 *
 * ```ts
 * assert.deepStrictEqual(prepend_(0, [1, 2, 3]), [0, 1, 2, 3])
 * ```
 */
export function prepend_<A>(tail: Array<A>, head: A): Array<A> {
  const len = tail.length
  const r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    r[i + 1] = tail[i]
  }
  r[0] = head
  return r as unknown as Array<A>
}

/**
 * Attaches an element to the front of an array, creating a new non empty array
 *
 * @ets_data_first prepend_
 */
export function prepend<A>(head: A): (tail: Array<A>) => Array<A> {
  return (tail) => prepend_(tail, head)
}

/**
 * Drop a number of elements from the start of an array, creating a new array
 *
 * ```ts
 * assert.deepStrictEqual(drop(2)([1, 2, 3]), [3])
 * ```
 *
 * @ets_data_first drop_
 */
export function drop(n: number): <A>(as: Array<A>) => Array<A> {
  return (as) => drop_(as, n)
}

/**
 * Drop a number of elements from the start of an array, creating a new array
 */
export function drop_<A>(as: Array<A>, n: number): Array<A> {
  return as.slice(n, as.length)
}

/**
 * Remove the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * ```ts
 * assert.deepStrictEqual(dropWhile((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), [2, 4, 5])
 * ```
 *
 * @ets_data_first dropWhile_
 */
export function dropWhile<A>(predicate: Predicate<A>): (as: Array<A>) => Array<A> {
  return (as) => dropWhile_(as, predicate)
}

/**
 * Remove the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * ```
 * assert.deepStrictEqual(dropWhile((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), [2, 4, 5])
 * ```
 */
export function dropWhile_<A>(as: Array<A>, predicate: Predicate<A>): Array<A> {
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
 * ```
 * assert.deepStrictEqual(dropRight(2)([1, 2, 3, 4, 5]), [1, 2, 3])
 * ```
 *
 * @ets_data_first dropRight_
 */
export function dropRight(n: number): <A>(as: Array<A>) => Array<A> {
  return (as) => dropRight_(as, n)
}

/**
 * Drop a number of elements from the end of an array, creating a new array
 *
 * ```
 * assert.deepStrictEqual(dropRight(2)([1, 2, 3, 4, 5]), [1, 2, 3])
 * ```
 */
export function dropRight_<A>(as: Array<A>, n: number): Array<A> {
  return as.slice(0, as.length - n)
}

/**
 * An empty array
 */
export function empty<A>(): Array<A> {
  return []
}

/**
 * Filters the array
 *
 * @ets_data_first filter_
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (fa: Array<A>) => Array<B>
export function filter<A>(predicate: Predicate<A>): (fa: Array<A>) => Array<A>
export function filter<A>(predicate: Predicate<A>): (fa: Array<A>) => Array<A> {
  return (fa) => fa.filter(predicate)
}

/**
 * Filters the array
 */
export function filter_<A, B extends A>(
  fa: Array<A>,
  refinement: Refinement<A, B>
): Array<B>
export function filter_<A>(fa: Array<A>, predicate: Predicate<A>): Array<A>
export function filter_<A>(fa: Array<A>, predicate: Predicate<A>): Array<A> {
  return fa.filter(predicate)
}

/**
 * Filters the array also passing element index
 *
 * @ets_data_first filterWithIndex_
 */
export function filterWithIndex<A>(
  predicate: (i: number, a: A) => boolean
): (nea: Array<A>) => Array<A> {
  return (nea) => filterWithIndex_(nea, predicate)
}

/**
 * Filters the array also passing element index
 */
export function filterWithIndex_<A>(
  nea: Array<A>,
  predicate: (i: number, a: A) => boolean
): Array<A> {
  return nea.filter((a, i) => predicate(i, a))
}

/**
 * Filters the array also mapping the output
 *
 * @ets_data_first collect_
 */
export const collect =
  <A, B>(f: (a: A) => Option<B>) =>
  (fa: Array<A>): Array<B> =>
    collect_(fa, f)

/**
 * Filters the array also mapping the output
 */
export function collect_<A, B>(fa: Array<A>, f: (a: A) => Option<B>): Array<B> {
  return collectWithIndex_(fa, (_, a) => f(a))
}

/**
 * Filters the array also mapping the output
 *
 * @ets_data_first collectWithIndex_
 */
export function collectWithIndex<A, B>(f: (i: number, a: A) => Option<B>) {
  return (fa: Array<A>): Array<B> => collectWithIndex_(fa, f)
}

/**
 * Filters the array also mapping the output
 */
export function collectWithIndex_<A, B>(
  fa: Array<A>,
  f: (i: number, a: A) => Option<B>
): Array<B> {
  const result: MutableArray<B> = []
  for (let i = 0; i < fa.length; i++) {
    const optionB = f(i, fa[i]!)
    if (isSome(optionB)) {
      result.push(optionB.value)
    }
  }
  return result
}

/**
 * Maps an array until `none` is returned
 */
export function collectWhile_<A, B>(arr: Array<A>, f: (x: A) => Option<B>): Array<B> {
  const result: MutableArray<B> = []

  for (let i = 0; i < arr.length; i++) {
    const o = f(arr[i]!)

    if (isSome(o)) {
      result.push(o.value)
    } else {
      break
    }
  }

  return result
}

/**
 * Maps an array until `none` is returned
 *
 * @ets_data_first collectWhile_
 */
export function collectWhile<A, B>(f: (x: A) => Option<B>) {
  return (arr: Array<A>) => collectWhile_(arr, f)
}

/**
 * Find the first element which satisfies a predicate (or a refinement) function
 *
 * ```ts
 * assert.deepStrictEqual(find((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 1 }))
 * ```
 *
 * @ets_data_first find_
 */
export function find<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Option<B>
export function find<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A>
export function find<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A> {
  return (as) => find_(as, predicate)
}

/**
 * Find the first element which satisfies a predicate (or a refinement) function
 */
export function find_<A, B extends A>(
  as: Array<A>,
  refinement: Refinement<A, B>
): Option<B>
export function find_<A>(as: Array<A>, predicate: Predicate<A>): Option<A>
export function find_<A>(as: Array<A>, predicate: Predicate<A>): Option<A> {
  return findWithIndex_(as, (_, a) => predicate(a))
}

/**
 * Find the first element which satisfies a predicate (or a refinement) function
 */
export function findWithIndex_<A, B extends A>(
  as: Array<A>,
  refinement: (i: number, a: A) => a is B
): Option<B>
export function findWithIndex_<A>(
  as: Array<A>,
  predicate: (i: number, a: A) => boolean
): Option<A>
export function findWithIndex_<A>(
  as: Array<A>,
  predicate: (i: number, a: A) => boolean
): Option<A> {
  const len = as.length
  for (let i = 0; i < len; i++) {
    if (predicate(i, as[i]!)) {
      return some(as[i]!)
    }
  }
  return none
}

/**
 * Find the first element which satisfies a predicate (or a refinement) function
 *
 *  @ets_data_first findWithIndex_
 */
export function findWithIndex<A, B extends A>(
  refinement: (i: number, a: A) => a is B
): (as: Array<A>) => Option<B>
export function findWithIndex<A>(
  predicate: (i: number, a: A) => boolean
): (as: Array<A>) => Option<A>
export function findWithIndex<A>(
  predicate: (i: number, a: A) => boolean
): (as: Array<A>) => Option<A> {
  return (as) => findWithIndex_(as, predicate)
}

/**
 * Find the first index for which a predicate holds
 *
 * ```
 * assert.deepStrictEqual(findIndex((n: number) => n === 2)([1, 2, 3]), some(1))
 * assert.deepStrictEqual(findIndex((n: number) => n === 2)([]), none)
 * ```
 *
 * @ets_data_first findIndex_
 */
export function findIndex<A>(
  predicate: Predicate<A>
): (as: Array<A>) => Option<number> {
  return (as) => findIndex_(as, predicate)
}

/**
 * Find the first index for which a predicate holds
 */
export function findIndex_<A>(as: Array<A>, predicate: Predicate<A>): Option<number> {
  const len = as.length
  for (let i = 0; i < len; i++) {
    if (predicate(as[i]!)) {
      return some(i)
    }
  }
  return none
}

/**
 * Find the last element which satisfies a predicate function
 *
 * ```
 * assert.deepStrictEqual(findLast((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 2 }))
 * ```
 *
 * @ets_data_first findLast_
 */
export function findLast<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Option<B>
export function findLast<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A>
export function findLast<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A> {
  return (as) => findLast_(as, predicate)
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
    if (predicate(as[i]!)) {
      return some(as[i]!)
    }
  }
  return none
}

/**
 * Returns the index of the last element of the list which matches the predicate
 *
 * ```ts
 * interface X {
 *   a: number
 *   b: number
 * }
 * const xs: Array<X> = [{ a: 1, b: 0 }, { a: 1, b: 1 }]
 * assert.deepStrictEqual(findLastIndex((x: { a: number }) => x.a === 1)(xs), some(1))
 * assert.deepStrictEqual(findLastIndex((x: { a: number }) => x.a === 4)(xs), none)
 * ```
 *
 * @ets_data_first findLastIndex_
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
    if (predicate(as[i]!)) {
      return some(i)
    }
  }
  return none
}

/**
 * Removes one level of nesting
 *
 * ```ts
 * assert.deepStrictEqual(flatten([[1], [2], [3]]), [1, 2, 3])
 * ```
 */
export function flatten<A>(mma: Array<Array<A>>): Array<A> {
  return chain_(mma, identity)
}

/**
 * Copies a mutable array into an immutable
 */
export function fromMutable<A>(as: MutableArray<A>): Array<A> {
  const l = as.length
  if (l === 0) {
    return empty<A>()
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
 * ```ts
 * assert.deepStrictEqual(head([1, 2, 3]), some(1))
 * assert.deepStrictEqual(head([]), none)
 * ```
 */
export function head<A>(as: Array<A>): Option<A> {
  return isEmpty(as) ? none : some(as[0]!)
}

/**
 * Test whether an array is empty
 *
 * ```
 * assert.strictEqual(isEmpty([]), true)
 * ```
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
 * Get the last element in an array, or `None` if the array is empty
 *
 * ```ts
 * assert.deepStrictEqual(last([1, 2, 3]), some(3))
 * assert.deepStrictEqual(last([]), none)
 * ```
 */
export function last<A>(as: Array<A>): Option<A> {
  return get_(as, as.length - 1)
}

/**
 * This function provides a safe way to read a value at a particular index from an array
 *
 * ```ts
 * assert.deepStrictEqual(get(1, [1, 2, 3]), some(2))
 * assert.deepStrictEqual(get(3, [1, 2, 3]), none)
 * ```
 */
export function get_<A>(as: Array<A>, i: number): Option<A> {
  return isOutOfBound(i, as) ? none : some(as[i]!)
}

/**
 * This function provides a safe way to read a value at a particular index from an array
 *
 * @ets_data_first get_
 */
export function get(i: number): <A>(as: Array<A>) => Option<A> {
  return (as) => get_(as, i)
}

/**
 * Return a list of length `n` with element `i` initialized with `f(i)`
 *
 * ```ts
 * const double = (n: number): number => n * 2
 * assert.deepStrictEqual(makeBy_(5, double), [0, 2, 4, 6, 8])
 * ```
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
 *
 * @ets_data_first makeBy_
 */
export function makeBy<A>(f: (i: number) => A): (n: number) => Array<A> {
  return (n) => makeBy_(n, f)
}

/**
 * Apply f to every element of Array<A> returning Array<B>
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (fa: Array<A>): Array<B> => fa.map(f)
}

/**
 * Apply f to every element of Array<A> returning Array<B>
 */
export function map_<A, B>(fa: Array<A>, f: (a: A) => B): Array<B> {
  return fa.map(f)
}

/**
 * Like map but also passes the index to f
 *
 * @ets_data_first mapWithIndex_
 */
export function mapWithIndex<A, B>(f: (i: number, a: A) => B) {
  return (fa: Array<A>): Array<B> => mapWithIndex_(fa, f)
}

/**
 * Like map but also passes the index to f
 */
export function mapWithIndex_<A, B>(fa: Array<A>, f: (i: number, a: A) => B): Array<B> {
  return fa.map((a, i) => f(i, a))
}

/**
 * Construct an array with a single element
 */
export function single<A>(a: A): Array<A> {
  return [a]
}

/**
 * Create an array containing a range of integers, including both endpoints
 *
 * ```ts
 * assert.deepStrictEqual(range(1, 5), [1, 2, 3, 4, 5])
 * ```
 */
export function range(start: number, end: number): Array<number> {
  return makeBy_(end - start + 1, (i) => start + i)
}

/**
 * Construct B by compacting with f over the array from left to right
 *
 * @ets_data_first reduce_
 */
export function reduce<A, B>(b: B, f: (b: B, a: A) => B) {
  return (fa: Array<A>): B => reduce_(fa, b, f)
}

/**
 * Construct B by compacting with f over the array from left to right
 */
export function reduce_<A, B>(fa: Array<A>, b: B, f: (b: B, a: A) => B): B {
  return reduceWithIndex_(fa, b, (_, b, a) => f(b, a))
}

/**
 * Construct B by compacting with f over the array from right to left
 *
 * @ets_data_first reduceRight_
 */
export function reduceRight<A, B>(b: B, f: (a: A, b: B) => B) {
  return (fa: Array<A>): B => reduceRight_(fa, b, f)
}

/**
 * Construct B by compacting with f over the array from right to left
 *
 */
export function reduceRight_<A, B>(fa: Array<A>, b: B, f: (a: A, b: B) => B): B {
  return reduceRightWithIndex_(fa, b, (_, a, b) => f(a, b))
}

/**
 * Construct B by compacting with f over the array from right to left
 *
 * @ets_data_first reduceRightWithIndex_
 */
export function reduceRightWithIndex<A, B>(b: B, f: (i: number, a: A, b: B) => B) {
  return (fa: Array<A>): B => fa.reduceRight((b, a, i) => f(i, a, b), b)
}

/**
 * Construct B by compacting with f over the array from right to left
 *
 */
export function reduceRightWithIndex_<A, B>(
  fa: Array<A>,
  b: B,
  f: (i: number, a: A, b: B) => B
): B {
  return fa.reduceRight((b, a, i) => f(i, a, b), b)
}

/**
 * Construct B by compacting with f over the array from left to right
 *
 * @ets_data_first reduceWithIndex_
 */
export function reduceWithIndex<A, B>(b: B, f: (i: number, b: B, a: A) => B) {
  return (fa: Array<A>): B => reduceWithIndex_(fa, b, f)
}

/**
 * Construct B by compacting with f over the array from left to right
 */
export function reduceWithIndex_<A, B>(
  fa: Array<A>,
  b: B,
  f: (i: number, b: B, a: A) => B
): B {
  const l = fa.length
  let r = b
  for (let i = 0; i < l; i++) {
    r = f(i, r, fa[i]!)
  }
  return r
}

/**
 * Create an array containing a value repeated the specified number of times
 *
 * ```ts
 * assert.deepStrictEqual(replicate_(3, 'a'), ['a', 'a', 'a'])
 * ```
 */
export function replicate_<A>(n: number, a: A): Array<A> {
  return makeBy_(n, () => a)
}

/**
 * Create an array containing a value repeated the specified number of times
 *
 * ```ts
 * assert.deepStrictEqual(replicate_(3, 'a'), ['a', 'a', 'a'])
 * ```
 *
 * @ets_data_first replicate_
 */
export function replicate<A>(a: A): (n: number) => Array<A> {
  return (n) => replicate_(n, a)
}

/**
 * Reverse an array, creating a new array
 *
 * ```ts
 * assert.deepStrictEqual(reverse([1, 2, 3]), [3, 2, 1])
 * ```
 */
export function reverse<A>(as: Array<A>): Array<A> {
  return [...as].reverse()
}

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * ```ts
 * assert.deepStrictEqual(append_([1, 2, 3], 4), [1, 2, 3, 4])
 * ```
 */
export function append_<A>(init: Array<A>, end: A): Array<A> {
  const len = init.length
  const r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    r[i] = init[i]
  }
  r[len] = end
  return r as unknown as Array<A>
}

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @ets_data_first append_
 */
export function append<A>(end: A): (init: Array<A>) => Array<A> {
  return (init) => append_(init, end)
}

/**
 * Splits an array into two pieces, the first piece has `n` elements.
 *
 * ```ts
 * assert.deepStrictEqual(splitAt(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4, 5]])
 * ```
 *
 * @ets_data_first aplitAt_
 */
export function splitAt(
  n: number
): <A>(as: Array<A>) => Tp.Tuple<[Array<A>, Array<A>]> {
  return (as) => Tp.tuple(as.slice(0, n), as.slice(n))
}

/**
 * Splits an array into two pieces, the first piece has `n` elements.
 */
export function splitAt_<A>(as: Array<A>, n: number): Tp.Tuple<[Array<A>, Array<A>]> {
  return Tp.tuple(as.slice(0, n), as.slice(n))
}

/**
 * Get all but the first element of an array, creating a new array, or `None` if the array is empty
 *
 * ```ts
 * assert.deepStrictEqual(tail([1, 2, 3]), some([2, 3]))
 * assert.deepStrictEqual(tail([]), none)
 * ```
 */
export function tail<A>(as: Array<A>): Option<Array<A>> {
  return isEmpty(as) ? none : some(as.slice(1))
}

/**
 * Keep only a number of elements from the start of an array, creating a new array.
 * `n` must be a natural number
 *
 * ```ts
 * assert.deepStrictEqual(take(2)([1, 2, 3]), [1, 2])
 * ```
 *
 * @ets_data_first take_
 */
export function take(n: number): <A>(as: Array<A>) => Array<A> {
  return (as) => as.slice(0, n)
}

/**
 * Keep only a number of elements from the start of an array, creating a new array.
 * `n` must be a natural number
 */
export function take_<A>(as: Array<A>, n: number): Array<A> {
  return as.slice(0, n)
}

/**
 * Calculate the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * ```ts
 * assert.deepStrictEqual(takeWhile((n: number) => n % 2 === 0)([2, 4, 3, 6]), [2, 4])
 * ```
 *
 * @ets_data_first takeWhile_
 */
export function takeWhile<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Array<B>
export function takeWhile<A>(predicate: Predicate<A>): (as: Array<A>) => Array<A>
export function takeWhile<A>(predicate: Predicate<A>): (as: Array<A>) => Array<A> {
  return (as) => takeWhile_(as, predicate)
}

/**
 * Calculate the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 */
export function takeWhile_<A, B extends A>(
  as: Array<A>,
  refinement: Refinement<A, B>
): Array<B>
export function takeWhile_<A>(as: Array<A>, predicate: Predicate<A>): Array<A>
export function takeWhile_<A>(as: Array<A>, predicate: Predicate<A>): Array<A> {
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
 * ```ts
 * assert.deepStrictEqual(takeRight(2)([1, 2, 3, 4, 5]), [4, 5])
 * ```
 *
 * @ets_data_first takeRight_
 */
export function takeRight(n: number): <A>(as: Array<A>) => Array<A> {
  return (as) => takeRight_(as, n)
}

/**
 * Keep only a number of elements from the end of an array, creating a new array.
 * `n` must be a natural number
 */
export function takeRight_<A>(as: Array<A>, n: number): Array<A> {
  return n === 0 ? empty<A>() : as.slice(-n)
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
export function unfold_<A, B>(b: B, f: (b: B) => Option<Tp.Tuple<[A, B]>>): Array<A> {
  const ret: MutableArray<A> = []
  let bb: B = b
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const mt = f(bb)
    if (isSome(mt)) {
      const [a, b] = mt.value.tuple
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
 *
 * @ets_data_first unfold_
 */
export function unfold<A, B>(f: (b: B) => Option<Tp.Tuple<[A, B]>>) {
  return (b: B) => unfold_(b, f)
}

/**
 * The function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 *
 * ```ts
 * assert.deepStrictEqual(unzip([[1, 'a'], [2, 'b'], [3, 'c']]), [[1, 2, 3], ['a', 'b', 'c']])
 * ```
 */
export function unzip<A, B>(
  as: Array<Tp.Tuple<[A, B]>>
): Tp.Tuple<[Array<A>, Array<B>]> {
  const fa: MutableArray<A> = []
  const fb: MutableArray<B> = []
  for (let i = 0; i < as.length; i++) {
    fa[i] = as[i]!.get(0)!
    fb[i] = as[i]!.get(1)!
  }
  return Tp.tuple(fa, fb)
}

/**
 * Takes two arrays and returns an array of corresponding pairs. If one input array is short, excess elements of the
 * longer array are discarded
 *
 * ```ts
 * assert.deepStrictEqual(zip([1, 2, 3], ['a', 'b', 'c', 'd']), [[1, 'a'], [2, 'b'], [3, 'c']])
 * ```
 * @ets_data_first zip_
 */
export function zip<B>(fb: Array<B>): <A>(fa: Array<A>) => Array<Tp.Tuple<[A, B]>> {
  return zipWith(fb, Tp.tuple)
}

/**
 * Takes two arrays and returns an array of corresponding pairs. If one input array is short, excess elements of the
 * longer array are discarded
 */
export function zip_<A, B>(fa: Array<A>, fb: Array<B>): Array<Tp.Tuple<[A, B]>> {
  return zipWith_(fa, fb, Tp.tuple)
}

/**
 * Apply a function to pairs of elements at the same index in two arrays, collecting the results in a new array. If one
 * input array is short, excess elements of the longer array are discarded.
 *
 * ```ts
 * assert.deepStrictEqual(zipWith([1, 2, 3], ['a', 'b', 'c', 'd'], (n, s) => s + n), ['a1', 'b2', 'c3'])
 * ```
 */
export function zipWith_<A, B, C>(
  fa: Array<A>,
  fb: Array<B>,
  f: (a: A, b: B) => C
): Array<C> {
  const fc: MutableArray<C> = []
  const len = Math.min(fa.length, fb.length)
  for (let i = 0; i < len; i++) {
    fc[i] = f(fa[i]!, fb[i]!)
  }
  return fc
}

/**
 * Apply a function to pairs of elements at the same index in two arrays, collecting the results in a new array. If one
 * input array is short, excess elements of the longer array are discarded.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<A, B, C>(
  fb: Array<B>,
  f: (a: A, b: B) => C
): (fa: Array<A>) => Array<C> {
  return (fa) => zipWith_(fa, fb, f)
}

/**
 * Constructs a new readonly array from an interable.
 */
export function from<A>(as: Iterable<A>): Array<A> {
  return Array.from(as)
}

/**
 * Joins together string arrays
 */
export function join_(as: Array<string>, s: string): string {
  return as.join(s)
}

/**
 * Joins together string arrays
 *
 * @ets_data_first join_
 */
export function join(s: string): (as: Array<string>) => string {
  return (as) => as.join(s)
}

/**
 * A useful recursion pattern for processing an array to produce a new array, often used for "chopping" up the input
 * array. Typically chop is called with some function that will consume an initial prefix of the array and produce a
 * value and the rest of the array.
 *
 * @ets_data_first chop_
 */
export function chop<A, B>(
  f: (as: NonEmptyArray<A>) => Tp.Tuple<[B, Array<A>]>
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
  f: (as: NonEmptyArray<A>) => Tp.Tuple<[B, Array<A>]>
): Array<B> {
  const result: MutableArray<B> = []
  let cs: Array<A> = as
  while (isNonEmpty(cs)) {
    const {
      tuple: [b, c]
    } = f(cs)
    result.push(b)
    cs = c
  }
  return result
}

/**
 * Test whether an array contains a particular index
 */
export function isOutOfBound<A>(i: number, as: Array<A>): boolean {
  return i < 0 || i >= as.length
}

/**
 * Finds the first index that doesn't satisfy predicate or the length of as
 */
export function spanIndex_<A>(as: Array<A>, predicate: Predicate<A>): number {
  const l = as.length
  let i = 0
  for (; i < l; i++) {
    if (!predicate(as[i]!)) {
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
 * ```ts
 * assert.deepStrictEqual(spanLeft((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), { init: [1, 3], rest: [2, 4, 5] })
 * ```
 *
 * @ets_data_first spanLeft_
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
 * Returns the size of an array
 */
export function size<A>(as: Array<A>): number {
  return as.length
}

/**
 * Returns true if all the elements of the array match a predicate
 */
export function forAll_<A>(as: Array<A>, pred: Predicate<A>): boolean {
  for (const a of as) {
    if (!pred(a)) {
      return false
    }
  }

  return true
}

/**
 * Returns true if all the elements of the array match a predicate
 *
 * @ets_data_first forAll_
 */
export function forAll<A>(pred: Predicate<A>) {
  return (as: Array<A>) => forAll_(as, pred)
}

/**
 * Returns true if any the elements of the array match a predicate
 */
export function forAny_<A>(as: Array<A>, pred: Predicate<A>): boolean {
  for (const a of as) {
    if (pred(a)) {
      return true
    }
  }

  return false
}

/**
 * Returns true if any the elements of the array match a predicate
 *
 * @ets_data_first forAny_
 */
export function forAny<A>(pred: Predicate<A>) {
  return (as: Array<A>) => forAny_(as, pred)
}

/**
 * Returns true if the array contains the element
 */
export function includes_<A>(as: Array<A>, elem: A): boolean {
  for (const a of as) {
    if (a === elem) {
      return true
    }
  }

  return false
}

/**
 * Returns true if the array contains the element
 *
 * @ets_data_first includes_
 */
export function includes<A>(elem: A) {
  return (as: Array<A>) => includes_(as, elem)
}

/**
 * Returns a copy of the array
 */
export function copy<A>(as: Array<A>): Array<A> {
  return as.slice(0)
}
