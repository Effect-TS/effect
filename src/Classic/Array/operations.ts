import type { Array } from "@effect-ts/system/Array"
import * as A from "@effect-ts/system/Array"
import { flow, pipe } from "@effect-ts/system/Function"

import type { ArrayURI } from "../../Modules"
import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"
import type { Equal } from "../Equal"

export * from "@effect-ts/system/Array"

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

export const foreachF = P.implementForeachF<[ArrayURI]>()((_) => (G) => (f) =>
  foreachWithIndexF(G)((_, a) => f(a))
)

export const separateF = P.implementSeparateF<[ArrayURI]>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.separate))
)

export const compactF = P.implementCompactF<[ArrayURI]>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.compact))
)

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
 * Creates an array of array values not included in the other given array using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 */
export function difference_<A>(E: Equal<A>): (xs: Array<A>, ys: Array<A>) => Array<A> {
  const elemE = elem_(E)
  return (xs, ys) => xs.filter((a) => !elemE(ys, a))
}

/**
 * Creates an array of array values not included in the other given array using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 */
export function difference<A>(
  E: Equal<A>
): (ys: Array<A>) => (xs: Array<A>) => Array<A> {
  const elemE = elem_(E)
  return (ys) => (xs) => xs.filter((a) => !elemE(ys, a))
}
