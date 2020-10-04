import type { Array } from "@effect-ts/system/Array"
import * as A from "@effect-ts/system/Array"
import { flow, pipe } from "@effect-ts/system/Function"
import type { MutableArray } from "@effect-ts/system/Mutable"

import type { ArrayURI } from "../../Modules"
import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"
import type { Equal } from "../Equal"
import { makeEqual } from "../Equal"
import type { Identity } from "../Identity"
import { makeIdentity } from "../Identity"
import * as Ord from "../Ord"
import { fromCompare } from "../Ord"
import { ordNumber } from "../Ord/common"
import { toNumber } from "../Ordering"
import type { Show } from "../Show"

export * from "@effect-ts/system/Array"

/**
 * `TraversableWithIndex`'s `foreachWithIndexF` function
 */
export const foreachWithIndexF = P.implementForeachWithIndexF<[ArrayURI]>()(
  (_) => (G) => (f) =>
    A.reduceWithIndex(DSL.succeedF(G)([] as typeof _.B[]), (k, b, a) =>
      pipe(
        b,
        G.both(f(k, a)),
        G.map(([x, y]) => {
          x.push(y)
          return x
        })
      )
    )
)

/**
 * `Traversable`'s `foreachF` function
 */
export const foreachF = P.implementForeachF<[ArrayURI]>()((_) => (G) => (f) =>
  foreachWithIndexF(G)((_, a) => f(a))
)

/**
 * `Wilt`'s `separateF` function
 */
export const separateF = P.implementSeparateF<[ArrayURI]>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.separate))
)

/**
 * `Wilt`'s `separateF` function
 */
export const separateWithIndexF = P.implementSeparateWithIndexF<
  [ArrayURI]
>()((_) => (G) => (f) => flow(foreachWithIndexF(G)(f), G.map(A.separate)))

/**
 * `Wither`'s `compactF` function
 */
export const compactF = P.implementCompactF<[ArrayURI]>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.compact))
)

/**
 * `WitherWithIndex`'s `compactWithIndexF` function
 */
export const compactWithIndexF = P.implementCompactWithIndexF<
  [ArrayURI]
>()((_) => (G) => (f) => flow(foreachWithIndexF(G)(f), G.map(A.compact)))

/**
 * Test if a value is a member of an array. Takes a `Equal<A>` as a single
 * argument which returns the function to use to search for a value of type `A` in
 * an array of type `Array<A>`.
 */
export function elem<A>(E: Equal<A>): (a: A) => (as: Array<A>) => boolean {
  const elemE = elem_(E)
  return (a) => (as) => elemE(as, a)
}

/**
 * Test if a value is a member of an array. Takes a `Equal<A>` as a single
 * argument which returns the function to use to search for a value of type `A` in
 * an array of type `Array<A>`.
 */
export function elem_<A>(E: Equal<A>): (as: Array<A>, a: A) => boolean {
  return (as, a) => {
    const predicate = (element: A) => E.equals(a)(element)
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
 * Creates an array of array values not included in the other given array using a `Equal` for equality
 * comparisons. The order and references of result values are determined by the first array.
 */
export function difference_<A>(E: Equal<A>): (xs: Array<A>, ys: Array<A>) => Array<A> {
  const elemE = elem_(E)
  return (xs, ys) => xs.filter((a) => !elemE(ys, a))
}

/**
 * Creates an array of array values not included in the other given array using a `Equal` for equality
 * comparisons. The order and references of result values are determined by the first array.
 */
export function difference<A>(
  E: Equal<A>
): (ys: Array<A>) => (xs: Array<A>) => Array<A> {
  const elemE = elem_(E)
  return (ys) => (xs) => xs.filter((a) => !elemE(ys, a))
}

/**
 * Derives an `Equal` over the `Array` of a given element type from the `Equal` of that type. The derived `Equal` defines two
 * arrays as equal if all elements of both arrays are compared equal pairwise with the given `E`. In case of arrays of
 * different lengths, the result is non equality.
 */
export function getEqual<A>(E: Equal<A>): Equal<Array<A>> {
  return makeEqual((ys) => (xs) =>
    xs === ys || (xs.length === ys.length && xs.every((x, i) => E.equals(ys[i])(x)))
  )
}

/**
 * Returns a `Identity` for `Array<A>`
 */
export function getIdentity<A>() {
  return makeIdentity(A.empty as Array<A>, A.concat)
}

/**
 * Returns a `Ord` for `Array<A>` given `Ord<A>`
 */
export function getOrd<A>(O: Ord.Ord<A>): Ord.Ord<Array<A>> {
  return fromCompare((b) => (a) => {
    const aLen = a.length
    const bLen = b.length
    const len = Math.min(aLen, bLen)
    for (let i = 0; i < len; i++) {
      const ordering = O.compare(b[i])(a[i])
      if (toNumber(ordering) !== 0) {
        return ordering
      }
    }
    return ordNumber.compare(bLen)(aLen)
  })
}

/**
 * Returns a `Show` for `Array<A>` given `Show<A>`
 */
export function getShow<A>(S: Show<A>): Show<Array<A>> {
  return {
    show: (as) => `[${as.map(S.show).join(", ")}]`
  }
}

/**
 * Creates an array of unique values that are included in all given arrays using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 */
export function intersection_<A>(
  E: Equal<A>
): (xs: Array<A>, ys: Array<A>) => Array<A> {
  const elemE = elem_(E)
  return (xs, ys) => xs.filter((a) => elemE(ys, a))
}

/**
 * Creates an array of unique values that are included in all given arrays using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 */
export function intersection<A>(
  E: Equal<A>
): (ys: Array<A>) => (xs: Array<A>) => Array<A> {
  const int = intersection_(E)
  return (ys) => (xs) => int(xs, ys)
}

/**
 * Fold Identity with a mapping function
 */
export function foldMap<M>(
  M: Identity<M>
): <A>(f: (a: A) => M) => (fa: readonly A[]) => M {
  return (f) => foldMapWithIndex(M)((_, a) => f(a))
}

/**
 * Fold Identity with a mapping function
 */
export function foldMap_<M>(
  M: Identity<M>
): <A>(fa: readonly A[], f: (a: A) => M) => M {
  return (fa, f) => foldMapWithIndex_(M)(fa, (_, a) => f(a))
}

/**
 * Fold Identity with a mapping function that consider also the index
 */
export function foldMapWithIndex<M>(
  M: Identity<M>
): <A>(f: (i: number, a: A) => M) => (fa: readonly A[]) => M {
  return (f) => (fa) => foldMapWithIndex_(M)(fa, f)
}

/**
 * Fold Identity with a mapping function that consider also the index
 */
export function foldMapWithIndex_<M>(
  M: Identity<M>
): <A>(fa: readonly A[], f: (i: number, a: A) => M) => M {
  return (fa, f) => fa.reduce((b, a, i) => M.combine(f(i, a))(b), M.identity)
}

/**
 * Sort the elements of an array in increasing order
 */
export function sort<A>(O: Ord.Ord<A>): (as: Array<A>) => Array<A> {
  return (as) => [...as].sort((x, y) => toNumber(O.compare(y)(x)))
}

/**
 * Sort the elements of an array in increasing order, where elements are compared using first `ords[0]`,
 * then `ords[1]`, then `ords[2]`, etc...
 */
export function sortBy<A>(ords: Array<Ord.Ord<A>>): (as: Array<A>) => Array<A> {
  const M = Ord.getIdentity<A>()
  return sort(ords.reduce((x, y) => M.combine(y)(x), M.identity))
}

/**
 * Creates an array of unique values, in order, from all given arrays using a `Equal` for equality comparisons
 */
export function union<A>(E: Equal<A>): (xs: Array<A>, ys: Array<A>) => Array<A> {
  const elemE = elem_(E)
  return (xs, ys) =>
    A.concat_(
      xs,
      ys.filter((a) => !elemE(xs, a))
    )
}

/**
 * Remove duplicates from an array, keeping the first occurrence of an element.
 */
export function uniq<A>(E: Equal<A>): (as: Array<A>) => Array<A> {
  const elemS = elem_(E)
  return (as) => {
    const r: MutableArray<A> = []
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
