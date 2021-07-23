// ets_tracing: off

import * as Chunk from "@effect-ts/system/Collections/Immutable/Chunk"
import type * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import type { Predicate } from "@effect-ts/system/Function"
import { identity, pipe } from "@effect-ts/system/Function"

import type { Either } from "../../../Either"
import type { Equal } from "../../../Equal"
import { makeEqual } from "../../../Equal"
import type { Identity } from "../../../Identity"
import { makeIdentity } from "../../../Identity"
import type { ChunkURI } from "../../../Modules"
import * as Ord from "../../../Ord"
import type { URI } from "../../../Prelude"
import * as P from "../../../Prelude"
import * as DSL from "../../../Prelude/DSL"
import type { Show } from "../../../Show"
import type { PredicateWithIndex, Separated } from "../../../Utils"

export * from "@effect-ts/system/Collections/Immutable/Chunk"

/**
 * `ForEachWithIndex`'s `forEachWithIndexF` function
 */
export const forEachWithIndexF = P.implementForEachWithIndexF<[URI<ChunkURI>]>()(
  (_) => (G) => {
    const succeed = DSL.succeedF(G)
    return (f) => (fa) => {
      let base = succeed(Chunk.empty<typeof _.B>())
      for (let k = 0; k < fa.length; k += 1) {
        base = G.map(
          ({ tuple: [bs, b] }: Tp.Tuple<[Chunk.Chunk<typeof _.B>, typeof _.B]>) =>
            Chunk.append_(bs, b)
        )(G.both(f(k, Chunk.unsafeGet_(fa, k)!))(base))
      }
      return base
    }
  }
)

/**
 * `ForEach`'s `forEachF` function
 */
export const forEachF = P.implementForEachF<[URI<ChunkURI>]>()(
  (_) => (G) => (f) => forEachWithIndexF(G)((_, a) => f(a))
)

/**
 * `Wilt`'s `separateF` function
 */
export const separateF = P.implementSeparateF<[URI<ChunkURI>]>()(
  (_) => (G) => (f) => (x) =>
    pipe(x, forEachF(G)(f), G.map(Chunk.partitionMap(identity)))
)

/**
 * `Wilt`'s `separateF` function
 */
export const separateWithIndexF = P.implementSeparateWithIndexF<[URI<ChunkURI>]>()(
  (_) => (G) => (f) => (x) =>
    pipe(x, forEachWithIndexF(G)(f), G.map(Chunk.partitionMap(identity)))
)

/**
 * `Wither`'s `compactF` function
 */
export const compactF = P.implementCompactF<[URI<ChunkURI>]>()(
  (_) => (G) => (f) => (x) => pipe(x, forEachF(G)(f), G.map(Chunk.compact))
)

/**
 * `WitherWithIndex`'s `compactWithIndexF` function
 */
export const compactWithIndexF = P.implementCompactWithIndexF<[URI<ChunkURI>]>()(
  (_) => (G) => (f) => (x) => pipe(x, forEachWithIndexF(G)(f), G.map(Chunk.compact))
)

/**
 * Test if a value is a member of an array. Takes a `Equal<A>` as a single
 * argument which returns the function to use to search for a value of type `A` in
 * an array of type `Chunk<A>`.
 */
export function elem<A>(E: Equal<A>): (a: A) => (as: Chunk.Chunk<A>) => boolean {
  const elemE = elem_(E)
  return (a) => (as) => elemE(as, a)
}

/**
 * Test if a value is a member of an array. Takes a `Equal<A>` as a single
 * argument which returns the function to use to search for a value of type `A` in
 * an array of type `Chunk<A>`.
 */
export function elem_<A>(E: Equal<A>): (as: Chunk.Chunk<A>, a: A) => boolean {
  return (as, a) => {
    const predicate = (element: A) => E.equals(element, a)
    let i = 0
    const len = as.length
    for (; i < len; i++) {
      if (predicate(Chunk.unsafeGet_(as, i)!)) {
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
export function difference_<A>(
  E: Equal<A>
): (xs: Chunk.Chunk<A>, ys: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  const elemE = elem_(E)
  return (xs, ys) => Chunk.filter_(xs, (a) => !elemE(ys, a))
}

/**
 * Creates an array of array values not included in the other given array using a `Equal` for equality
 * comparisons. The order and references of result values are determined by the first array.
 */
export function difference<A>(
  E: Equal<A>
): (ys: Chunk.Chunk<A>) => (xs: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  const diff = difference_(E)
  return (ys) => (xs) => diff(xs, ys)
}

/**
 * Derives an `Equal` over the `Chunk` of a given element type from the `Equal` of that type. The derived `Equal` defines two
 * arrays as equal if all elements of both arrays are compared equal pairwise with the given `E`. In case of arrays of
 * different lengths, the result is non equality.
 */
export function getEqual<A>(E: Equal<A>): Equal<Chunk.Chunk<A>> {
  return makeEqual((xs, ys) => xs === ys || Chunk.corresponds_(xs, ys, E.equals))
}

/**
 * Returns a `Identity` for `Chunk<A>`
 */
export function getIdentity<A>() {
  return makeIdentity(Chunk.empty<A>(), Chunk.concat_)
}

/**
 * Returns a `Ord` for `Chunk<A>` given `Ord<A>`
 */
export function getOrd<A>(O: Ord.Ord<A>): Ord.Ord<Chunk.Chunk<A>> {
  return Ord.makeOrd((a, b) => {
    const aLen = a.length
    const bLen = b.length
    const len = Math.min(aLen, bLen)
    for (let i = 0; i < len; i++) {
      const ordering = O.compare(Chunk.unsafeGet_(a, i)!, Chunk.unsafeGet_(b, i)!)
      if (ordering !== 0) {
        return ordering
      }
    }
    return Ord.number.compare(aLen, bLen)
  })
}

/**
 * Returns a `Show` for `Chunk<A>` given `Show<A>`
 */
export function getShow<A>(S: Show<A>): Show<Chunk.Chunk<A>> {
  return {
    show: (as) => `[${Chunk.map_(as, S.show)["|>"](Chunk.join(", "))}]`
  }
}

/**
 * Creates an array of unique values that are included in all given arrays using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 */
export function intersection_<A>(
  E: Equal<A>
): (xs: Chunk.Chunk<A>, ys: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  const elemE = elem_(E)
  return (xs, ys) => Chunk.filter_(xs, (a) => elemE(ys, a))
}

/**
 * Creates an array of unique values that are included in all given arrays using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 */
export function intersection<A>(
  E: Equal<A>
): (ys: Chunk.Chunk<A>) => (xs: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  const int = intersection_(E)
  return (ys) => (xs) => int(xs, ys)
}

/**
 * Fold Identity with a mapping function
 */
export function foldMap<M>(
  M: Identity<M>
): <A>(f: (a: A) => M) => (fa: Chunk.Chunk<A>) => M {
  return (f) => foldMapWithIndex(M)((_, a) => f(a))
}

/**
 * Fold Identity with a mapping function
 */
export function foldMap_<M>(
  M: Identity<M>
): <A>(fa: Chunk.Chunk<A>, f: (a: A) => M) => M {
  return (fa, f) => foldMapWithIndex_(M)(fa, (_, a) => f(a))
}

/**
 * Fold Identity with a mapping function that consider also the index
 */
export function foldMapWithIndex<M>(
  M: Identity<M>
): <A>(f: (i: number, a: A) => M) => (fa: Chunk.Chunk<A>) => M {
  return (f) => (fa) => foldMapWithIndex_(M)(fa, f)
}

/**
 * Fold Identity with a mapping function that consider also the index
 */
export function foldMapWithIndex_<M>(
  M: Identity<M>
): <A>(fa: Chunk.Chunk<A>, f: (i: number, a: A) => M) => M {
  return (fa, f) =>
    Chunk.reduce_(Chunk.zipWithIndex(fa), M.identity, (b, { tuple: [a, i] }) =>
      M.combine(b, f(i, a))
    )
}

/**
 * Sort the elements of an array in increasing order
 */
export function sort<A>(O: Ord.Ord<A>): (as: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  return (as) => Chunk.from([...Chunk.toArray(as)].sort((x, y) => O.compare(x, y)))
}

/**
 * Sort the elements of an array in increasing order, where elements are compared using first `ords[0]`,
 * then `ords[1]`, then `ords[2]`, etc...
 */
export function sortBy<A>(
  ords: Array<Ord.Ord<A>>
): (as: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  const M = Ord.getIdentity<A>()
  return sort(ords.reduce((x, y) => M.combine(x, y), M.identity))
}

/**
 * Creates an array of unique values, in order, from all given arrays using a `Equal` for equality comparisons
 */
export function union_<A>(
  E: Equal<A>
): (xs: Chunk.Chunk<A>, ys: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  const elemE = elem_(E)
  return (xs, ys) =>
    Chunk.concat_(
      xs,
      Chunk.filter_(ys, (a) => !elemE(xs, a))
    )
}

/**
 * Creates an array of unique values, in order, from all given arrays using a `Equal` for equality comparisons
 */
export function union<A>(
  E: Equal<A>
): (ys: Chunk.Chunk<A>) => (xs: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  const un = union_(E)
  return (ys) => (xs) => un(xs, ys)
}

/**
 * Remove duplicates from an array, keeping the first occurrence of an element.
 */
export function uniq<A>(E: Equal<A>): (as: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  const elemS = elem_(E)
  return (as) => {
    let r: Chunk.Chunk<A> = Chunk.empty()
    const len = as.length
    let i = 0
    for (; i < len; i++) {
      const a = as[i]!
      if (!elemS(r, a)) {
        r = Chunk.append_(r, a)
      }
    }
    return len === r.length ? as : r
  }
}

/**
 * Separate elements based on a apredicate
 */
export function partition<A>(predicate: Predicate<A>) {
  return (fa: Chunk.Chunk<A>): Separated<Chunk.Chunk<A>, Chunk.Chunk<A>> =>
    partitionWithIndex((_, a: A) => predicate(a))(fa)
}

/**
 * Separate elements based on a apredicate
 */
export function partition_<A>(
  fa: Chunk.Chunk<A>,
  predicate: Predicate<A>
): Separated<Chunk.Chunk<A>, Chunk.Chunk<A>> {
  return partitionWithIndex((_, a: A) => predicate(a))(fa)
}

/**
 * Separate elements based on a map function that also carry the index
 */
export function partitionMapWithIndex_<A, B, C>(
  fa: Chunk.Chunk<A>,
  f: (i: number, a: A) => Either<B, C>
): Separated<Chunk.Chunk<B>, Chunk.Chunk<C>> {
  const left: Array<B> = []
  const right: Array<C> = []
  for (let i = 0; i < fa.length; i++) {
    const e = f(i, Chunk.unsafeGet_(fa, i)!)
    if (e._tag === "Left") {
      left.push(e.left)
    } else {
      right.push(e.right)
    }
  }
  return {
    left: Chunk.from(left),
    right: Chunk.from(right)
  }
}

/**
 * Separate elements based on a map function that also carry the index
 */
export function partitionMapWithIndex<A, B, C>(f: (i: number, a: A) => Either<B, C>) {
  return (fa: Chunk.Chunk<A>): Separated<Chunk.Chunk<B>, Chunk.Chunk<C>> =>
    partitionMapWithIndex_(fa, f)
}

/**
 * Separate elements based on a predicate that also carry the index
 */
export function partitionWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<number, A>
) {
  return (fa: Chunk.Chunk<A>): Separated<Chunk.Chunk<A>, Chunk.Chunk<A>> =>
    partitionWithIndex_(fa, predicateWithIndex)
}

/**
 * Separate elements based on a predicate that also carry the index
 */
export function partitionWithIndex_<A>(
  fa: Chunk.Chunk<A>,
  predicateWithIndex: PredicateWithIndex<number, A>
): Separated<Chunk.Chunk<A>, Chunk.Chunk<A>> {
  const left: Array<A> = []
  const right: Array<A> = []
  for (let i = 0; i < fa.length; i++) {
    const a = Chunk.unsafeGet_(fa, i)!
    if (predicateWithIndex(i, a)) {
      right.push(a)
    } else {
      left.push(a)
    }
  }
  return {
    left: Chunk.from(left),
    right: Chunk.from(right)
  }
}
