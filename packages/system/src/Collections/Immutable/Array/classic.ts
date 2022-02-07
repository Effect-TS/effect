// ets_tracing: off

import type { Either } from "../../../Either/core.js"
import type { Predicate, Refinement } from "../../../Function/core.js"
import type { Option } from "../../../Option/index.js"
import { isSome, none, some } from "../../../Option/index.js"
import type { MutableArray, MutableRecord } from "../../../Support/Mutable/index.js"
import type { Dictionary } from "../Dictionary/index.js"
import type { NonEmptyArray } from "../NonEmptyArray/index.js"
import * as Tp from "../Tuple/index.js"
import * as C from "./core.js"

/**
 * Classic Applicative's ap
 */
export function ap<A>(fa: C.Array<A>) {
  return <B>(fab: C.Array<(a: A) => B>): C.Array<B> => ap_(fab, fa)
}

/**
 * Classic Applicative's ap
 */
export function ap_<A, B>(fab: C.Array<(a: A) => B>, fa: C.Array<A>): C.Array<B> {
  return C.flatten(C.map((f: (a: A) => B) => C.map(f)(fa))(fab))
}

/**
 * Array comprehension
 *
 * ```
 * [ f(x, y, ...) | x ← xs, y ← ys, ..., g(x, y, ...) ]
 * ```
 *
 * ```ts
 * assert.deepStrictEqual(comprehension([[1, 2, 3], ['a', 'b']], tuple, (a, b) => (a + b.length) % 2 === 0), [
 *   [1, 'a'],
 *   [1, 'b'],
 *   [3, 'a'],
 *   [3, 'b']
 * ])
 * ```
 */
export function comprehension<A, B, C, D, R>(
  input: readonly [Array<A>, C.Array<B>, C.Array<C>, C.Array<D>],
  f: (a: A, b: B, c: C, d: D) => R,
  g?: (a: A, b: B, c: C, d: D) => boolean
): C.Array<R>
export function comprehension<A, B, C, R>(
  input: readonly [C.Array<A>, C.Array<B>, C.Array<C>],
  f: (a: A, b: B, c: C) => R,
  g?: (a: A, b: B, c: C) => boolean
): C.Array<R>
export function comprehension<A, R>(
  input: readonly [C.Array<A>],
  f: (a: A) => R,
  g?: (a: A) => boolean
): C.Array<R>
export function comprehension<A, B, R>(
  input: readonly [C.Array<A>, C.Array<B>],
  f: (a: A, b: B) => R,
  g?: (a: A, b: B) => boolean
): C.Array<R>
export function comprehension<A, R>(
  input: readonly [C.Array<A>],
  f: (a: A) => boolean,
  g?: (a: A) => R
): C.Array<R>
export function comprehension<R>(
  input: C.Array<C.Array<any>>,
  f: (...xs: C.Array<any>) => R,
  g: (...xs: C.Array<any>) => boolean = () => true
): C.Array<R> {
  const go = (scope: C.Array<any>, input: C.Array<C.Array<any>>): C.Array<R> => {
    if (input.length === 0) {
      return g(...scope) ? [f(...scope)] : C.empty<R>()
    } else {
      return C.chain((x) => go(C.append_(scope, x), input.slice(1)))(input[0]!)
    }
  }
  return go(C.empty<R>(), input)
}

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * ```ts
 * assert.deepStrictEqual(deleteAt(0)([1, 2, 3]), some([2, 3]))
 * assert.deepStrictEqual(deleteAt(1)([]), none)
 * ```
 */
export function deleteAt(i: number): <A>(as: C.Array<A>) => Option<C.Array<A>> {
  return (as) => deleteAt_(as, i)
}

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 */
export function deleteAt_<A>(as: C.Array<A>, i: number): Option<C.Array<A>> {
  return C.isOutOfBound(i, as) ? none : some(unsafeDeleteAt_(as, i))
}

/**
 * Array[A] => Array[Array[A]]
 */
export function duplicate<A>(ma: C.Array<A>): C.Array<C.Array<A>> {
  return extend((x: C.Array<A>) => x)(ma)
}

/**
 * Extends calls f with all the progressive slices up to the current element's index,
 * and uses the return value to construct the result array
 *
 * i.e: like map that also consumes all the elements up to `i`
 */
export function extend<A, B>(f: (fa: C.Array<A>) => B) {
  return (ma: C.Array<A>): C.Array<B> => extend_(ma, f)
}

/**
 * Extends calls f with all the progressive slices up to the current element's index,
 * and uses the return value to construct the result array
 *
 * i.e: like map that also consumes all the elements up to `i`
 */
export function extend_<A, B>(ma: C.Array<A>, f: (fa: C.Array<A>) => B): C.Array<B> {
  return ma.map((_, i, as) => f(as.slice(i)))
}

/**
 * Find the first element returned by an option based selector function
 *
 * ```ts
 * interface Person {
 *   name: string
 *   age?: number
 * }
 *
 * const persons: Array<Person> = [{ name: 'John' }, { name: 'Mary', age: 45 }, { name: 'Joey', age: 28 }]
 *
 * // returns the name of the first person that has an age
 * assert.deepStrictEqual(findFirstMap((p: Person) => (p.age === undefined ? none : some(p.name)))(persons), some('Mary'))
 * ```
 */
export function findFirstMap<A, B>(
  f: (a: A) => Option<B>
): (as: C.Array<A>) => Option<B> {
  return (as) => findFirstMap_(as, f)
}

/**
 * Find the first element returned by an option based selector function
 */
export function findFirstMap_<A, B>(as: C.Array<A>, f: (a: A) => Option<B>): Option<B> {
  return findFirstMapWithIndex_(as, (_, a) => f(a))
}

/**
 * Find the first element returned by an option based selector function
 */
export function findFirstMapWithIndex_<A, B>(
  as: C.Array<A>,
  f: (i: number, a: A) => Option<B>
): Option<B> {
  const len = as.length
  for (let i = 0; i < len; i++) {
    const v = f(i, as[i]!)
    if (isSome(v)) {
      return v
    }
  }
  return none
}

/**
 * Find the first element returned by an option based selector function
 *
 * @ets_data_first findFirstMapWithIndex_
 */
export function findFirstMapWithIndex<A, B>(
  f: (i: number, a: A) => Option<B>
): (as: C.Array<A>) => Option<B> {
  return (as) => findFirstMapWithIndex_(as, f)
}

/**
 * Find the last element returned by an option based selector function
 *
 * ```ts
 * interface Person {
 *   name: string
 *   age?: number
 * }
 *
 * const persons: Array<Person> = [{ name: 'John' }, { name: 'Mary', age: 45 }, { name: 'Joey', age: 28 }]
 *
 * // returns the name of the last person that has an age
 * assert.deepStrictEqual(findLastMap((p: Person) => (p.age === undefined ? none : some(p.name)))(persons), some('Joey'))
 * ```
 */
export function findLastMap<A, B>(
  f: (a: A) => Option<B>
): (as: C.Array<A>) => Option<B> {
  return (as) => findLastMap_(as, f)
}

/**
 * Find the last element returned by an option based selector function
 */
export function findLastMap_<A, B>(as: C.Array<A>, f: (a: A) => Option<B>): Option<B> {
  const len = as.length
  for (let i = len - 1; i >= 0; i--) {
    const v = f(as[i]!)
    if (isSome(v)) {
      return v
    }
  }
  return none
}

/**
 * Break an array into its first element and remaining elements
 *
 * ```ts
 * const len: <A>(as: Array<A>) => number = foldLeft(() => 0, (_, tail) => 1 + len(tail))
 * assert.strictEqual(len([1, 2, 3]), 3)
 * ```
 */
export function foldLeft<A, B>(
  onNil: () => B,
  onCons: (head: A, tail: C.Array<A>) => B
): (as: C.Array<A>) => B {
  return (as) => foldLeft_(as, onNil, onCons)
}

/**
 * Break an array into its first element and remaining elements
 */
export function foldLeft_<A, B>(
  as: C.Array<A>,
  onNil: () => B,
  onCons: (head: A, tail: C.Array<A>) => B
): B {
  return C.isEmpty(as) ? onNil() : onCons(as[0]!, as.slice(1))
}

/**
 * Break an array into its initial elements and the last element
 */
export function foldRight<A, B>(
  onNil: () => B,
  onCons: (init: Array<A>, last: A) => B
): (as: Array<A>) => B {
  return (as) => foldRight_(as, onNil, onCons)
}

/**
 * Break an array into its initial elements and the last element
 */
export function foldRight_<A, B>(
  as: Array<A>,
  onNil: () => B,
  onCons: (init: Array<A>, last: A) => B
): B {
  return C.isEmpty(as)
    ? onNil()
    : onCons(as.slice(0, as.length - 1), as[as.length - 1]!)
}

/**
 * Get all but the last element of an array, creating a new array, or `None` if the array is empty
 *
 * ```
 * assert.deepStrictEqual(init([1, 2, 3]), some([1, 2]))
 * assert.deepStrictEqual(init([]), none)
 * ```
 */
export function init<A>(as: C.Array<A>): Option<C.Array<A>> {
  const len = as.length
  return len === 0 ? none : some(as.slice(0, len - 1))
}

/**
 * Insert an element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * ```
 * assert.deepStrictEqual(insertAt(2, 5)([1, 2, 3, 4]), some([1, 2, 5, 3, 4]))
 * ```
 */
export function insertAt<A>(i: number, a: A): (as: C.Array<A>) => Option<C.Array<A>> {
  return (as) => insertAt_(as, i, a)
}

/**
 * Insert an element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 */
export function insertAt_<A>(as: C.Array<A>, i: number, a: A): Option<C.Array<A>> {
  return i < 0 || i > as.length ? none : some(unsafeInsertAt_(as, i, a))
}

/**
 * Inserts index i (non safe)
 */
export function unsafeInsertAt_<A>(as: C.Array<A>, i: number, a: A): C.Array<A> {
  const xs = [...as]
  xs.splice(i, 0, a)
  return xs
}

/**
 * Inserts index i (non safe)
 */
export function unsafeInsertAt<A>(i: number, a: A): (as: C.Array<A>) => C.Array<A> {
  return (as) => unsafeInsertAt_(as, i, a)
}

/**
 * Change the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * ```ts
 * assert.deepStrictEqual(updateAt(1, 1)([1, 2, 3]), some([1, 1, 3]))
 * assert.deepStrictEqual(updateAt(1, 1)([]), none)
 * ```
 */
export function updateAt<A>(i: number, a: A): (as: C.Array<A>) => Option<C.Array<A>> {
  return (as) => updateAt_(as, i, a)
}

/**
 * Change the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 */
export function updateAt_<A>(as: C.Array<A>, i: number, a: A): Option<C.Array<A>> {
  return C.isOutOfBound(i, as) ? none : some(unsafeUpdateAt_(as, i, a))
}

/**
 * Updates index i (non safe)
 */
export function unsafeUpdateAt_<A>(as: C.Array<A>, i: number, a: A): C.Array<A> {
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
export function unsafeUpdateAt<A>(i: number, a: A): (as: C.Array<A>) => C.Array<A> {
  return (as) => unsafeUpdateAt_(as, i, a)
}

/**
 * Extracts from an array of `Either` all the `Left` elements. All the `Left` elements are extracted in order
 *
 * ```ts
 * assert.deepStrictEqual(lefts([right(1), left('foo'), right(2)]), ['foo'])
 * ```
 */
export function lefts<E, A>(as: C.Array<Either<E, A>>): C.Array<E> {
  const r: MutableArray<E> = []
  const len = as.length
  for (let i = 0; i < len; i++) {
    const a = as[i]!
    if (a._tag === "Left") {
      r.push(a.left)
    }
  }
  return r
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * ```ts
 * const double = (x: number): number => x * 2
 * assert.deepStrictEqual(modifyAt(1, double)([1, 2, 3]), some([1, 4, 3]))
 * assert.deepStrictEqual(modifyAt(1, double)([]), none)
 * ```
 */
export function modifyAt<A>(
  i: number,
  f: (a: A) => A
): (as: C.Array<A>) => Option<C.Array<A>> {
  return (as) =>
    C.isOutOfBound(i, as) ? none : some(unsafeUpdateAt_(as, i, f(as[i]!)))
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 */
export function modifyAt_<A>(
  as: C.Array<A>,
  i: number,
  f: (a: A) => A
): Option<C.Array<A>> {
  return C.isOutOfBound(i, as) ? none : some(unsafeUpdateAt_(as, i, f(as[i]!)))
}

/**
 * Extracts from an array of `Either` all the `Right` elements. All the `Right` elements are extracted in order
 *
 * ```ts
 * assert.deepStrictEqual(rights([right(1), left('foo'), right(2)]), [1, 2])
 * ```
 */
export function rights<E, A>(as: C.Array<Either<E, A>>): C.Array<A> {
  const r: MutableArray<A> = []
  const len = as.length
  for (let i = 0; i < len; i++) {
    const a = as[i]!
    if (a._tag === "Right") {
      r.push(a.right)
    }
  }
  return r
}

/**
 * Rotate an array to the right by `n` steps
 *
 * ```ts
 * assert.deepStrictEqual(rotate(2)([1, 2, 3, 4, 5]), [4, 5, 1, 2, 3])
 * ```
 */
export function rotate(n: number): <A>(as: C.Array<A>) => C.Array<A> {
  return (as) => rotate_(as, n)
}

/**
 * Rotate an array to the right by `n` steps
 */
export function rotate_<A>(as: C.Array<A>, n: number): C.Array<A> {
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
export function scanLeft<A, B>(
  b: B,
  f: (b: B, a: A) => B
): (as: C.Array<A>) => C.Array<B> {
  return (as) => scanLeft_(as, b, f)
}

/**
 * Same as `reduce` but it carries over the intermediate steps
 */
export function scanLeft_<A, B>(
  as: C.Array<A>,
  b: B,
  f: (b: B, a: A) => B
): C.Array<B> {
  const l = as.length
  const r: MutableArray<B> = new Array(l + 1)
  r[0] = b
  for (let i = 0; i < l; i++) {
    r[i + 1] = f(r[i]!, as[i]!)
  }
  return r
}

/**
 * Fold an array from the right, keeping all intermediate results instead of only the final result
 *
 * ```ts
 * assert.deepStrictEqual(scanRight(10, (a: number, b) => b - a)([1, 2, 3]), [4, 5, 7, 10])
 * ```
 */
export function scanRight<A, B>(
  b: B,
  f: (a: A, b: B) => B
): (as: C.Array<A>) => C.Array<B> {
  return (as) => scanRight_(as, b, f)
}

/**
 * Fold an array from the right, keeping all intermediate results instead of only the final result
 */
export function scanRight_<A, B>(
  as: C.Array<A>,
  b: B,
  f: (a: A, b: B) => B
): C.Array<B> {
  const l = as.length
  const r: MutableArray<B> = new Array(l + 1)
  r[l] = b
  for (let i = l - 1; i >= 0; i--) {
    r[i] = f(as[i]!, r[i + 1]!)
  }
  return r
}

/**
 * Takes elements until the predicate returns positively
 */
export function takeUntil<A, B extends A>(
  predicate: Refinement<A, B>
): (as: C.Array<A>) => C.Array<B>
export function takeUntil<A>(predicate: Predicate<A>): (as: C.Array<A>) => C.Array<A>
export function takeUntil<A>(predicate: Predicate<A>): (as: C.Array<A>) => C.Array<A> {
  return (as) => takeUntil_(as, predicate)
}

/**
 * Takes elements until the predicate returns positively
 */
export function takeUntil_<A, B extends A>(
  as: C.Array<A>,
  predicate: Refinement<A, B>
): C.Array<B>
export function takeUntil_<A>(as: C.Array<A>, predicate: Predicate<A>): C.Array<A>
export function takeUntil_<A>(as: C.Array<A>, predicate: Predicate<A>): C.Array<A> {
  const init = []

  for (let i = 0; i < as.length; i++) {
    init[i] = as[i]!
    if (predicate(as[i]!)) {
      return init
    }
  }

  return init
}

/**
 * Deletes index i (non safe)
 */
export function unsafeDeleteAt_<A>(as: C.Array<A>, i: number): C.Array<A> {
  const xs = [...as]
  xs.splice(i, 1)
  return xs
}

/**
 * Deletes index i (non safe)
 */
export function unsafeDeleteAt(i: number): <A>(as: C.Array<A>) => C.Array<A> {
  return (as) => unsafeDeleteAt_(as, i)
}

/**
 * Separate Array
 */
export function separate<B, C>(
  fa: C.Array<Either<B, C>>
): Tp.Tuple<[C.Array<B>, C.Array<C>]> {
  const left: MutableArray<B> = []
  const right: MutableArray<C> = []
  for (const e of fa) {
    if (e._tag === "Left") {
      left.push(e.left)
    } else {
      right.push(e.right)
    }
  }
  return Tp.tuple(left, right)
}

/**
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 */
export function groupBy<A>(
  f: (a: A) => string
): (as: C.Array<A>) => Dictionary<NonEmptyArray<A>> {
  return (as) => groupBy_(as, f)
}

/**
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 */
export function groupBy_<A>(
  as: C.Array<A>,
  f: (a: A) => string
): Dictionary<NonEmptyArray<A>> {
  const r: MutableRecord<string, MutableArray<A> & { 0: A }> = {}
  for (const a of as) {
    const k = f(a)
    // eslint-disable-next-line no-prototype-builtins
    if (r.hasOwnProperty(k)) {
      r[k]!.push(a)
    } else {
      r[k] = [a]
    }
  }
  return r
}
