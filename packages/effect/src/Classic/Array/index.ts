import * as A from "@effect-ts/system/Array"
import { flow, pipe } from "@effect-ts/system/Function"

import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"

export const ArrayURI = "Array"
export type ArrayURI = typeof ArrayURI

declare module "../../Prelude/HKT" {
  interface URItoKind<D, N extends string, K, SI, SO, X, I, S, R, E, A> {
    [ArrayURI]: A.Array<A>
  }
  interface URItoIndex<N extends string, K> {
    [ArrayURI]: number
  }
}

export const Any = P.instance<P.Any<[ArrayURI]>>({
  any: () => [{}]
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[ArrayURI]>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[ArrayURI]>>({
  flatten: A.flatten
})

export const Covariant = P.instance<P.Covariant<[ArrayURI]>>({
  map: A.map
})

export const Applicative: P.Applicative<[ArrayURI]> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

export const Monad: P.Monad<[ArrayURI]> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
}

export const foreachF = P.implementForeachF<[ArrayURI]>()((_) => (G) => (f) =>
  foreachWithIndexF(G)((_, a) => f(a))
)

export const Traversable = P.instance<P.Traversable<[ArrayURI]>>({
  map: A.map,
  foreachF
})

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

export const TraversableWithIndex = P.instance<P.TraversableWithIndex<[ArrayURI]>>({
  map: A.map,
  foreachWithIndexF
})

export const separateF = P.implementSeparateF<[ArrayURI]>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.separate))
)

export const Wiltable = P.instance<P.Wiltable<[ArrayURI]>>({
  separateF
})

export const compactF = P.implementCompactF<[ArrayURI]>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.compact))
)

export const Witherable = P.instance<P.Witherable<[ArrayURI]>>({
  compactF
})

export const compactWithIndexF = P.implementCompactWithIndexF<
  [ArrayURI]
>()((_) => (G) => (f) => flow(foreachWithIndexF(G)(f), G.map(A.compact)))

export const WitherableWithIndex = P.instance<P.WitherableWithIndex<[ArrayURI]>>({
  compactWithIndexF
})

export const Compact = P.instance<P.Compact<[ArrayURI]>>({
  compact: A.compact
})

export const Separate = P.instance<P.Separate<[ArrayURI]>>({
  separate: A.separate
})

export const Extend = P.instance<P.Extend<[ArrayURI]>>({
  extend: A.extend
})

export {
  ap,
  ap_,
  Array,
  chain,
  chain_,
  chop,
  chop_,
  chunksOf,
  chunksOf_,
  compact,
  comprehension,
  concat,
  concat_,
  cons,
  cons_,
  deleteAt,
  deleteAt_,
  dropLeft,
  dropLeftWhile,
  dropLeftWhile_,
  dropLeft_,
  dropRight,
  dropRight_,
  duplicate,
  empty,
  extend,
  extend_,
  filter,
  filterMap,
  filterMapWithIndex,
  filterMapWithIndex_,
  filterMap_,
  filterWithIndex,
  filterWithIndex_,
  filter_,
  findFirst,
  findFirstMap,
  findFirstMap_,
  findFirst_,
  findIndex,
  findIndex_,
  findLast,
  findLastIndex,
  findLastIndex_,
  findLastMap,
  findLastMap_,
  findLast_,
  flatten,
  foldLeft,
  foldLeft_,
  foldRight,
  foldRight_,
  fromMutable,
  head,
  init,
  insertAt,
  insertAt_,
  isEmpty,
  isNonEmpty,
  isOutOfBound,
  last,
  lefts,
  lookup,
  lookup_,
  makeBy,
  makeBy_,
  map,
  mapWithIndex,
  mapWithIndex_,
  map_,
  modifyAt,
  modifyAt_,
  range,
  reduce,
  reduceRight,
  reduceRightWithIndex,
  reduceRightWithIndex_,
  reduceRight_,
  reduceWithIndex,
  reduceWithIndex_,
  reduce_,
  replicate,
  replicate_,
  reverse,
  rights,
  rotate,
  rotate_,
  scanLeft,
  scanLeft_,
  scanRight,
  scanRight_,
  separate,
  single,
  snoc,
  snoc_,
  spanIndex_,
  spanLeft,
  spanLeft_,
  Spanned,
  splitAt,
  splitAt_,
  tail,
  takeLeft,
  takeLeftWhile,
  takeLeftWhile_,
  takeLeft_,
  takeRight,
  takeRight_,
  tap,
  tap_,
  toMutable,
  unfold,
  unfold_,
  unsafeDeleteAt,
  unsafeDeleteAt_,
  unsafeInsertAt,
  unsafeInsertAt_,
  unsafeUpdateAt,
  unsafeUpdateAt_,
  unzip,
  updateAt,
  updateAt_,
  zip,
  zipWith,
  zipWith_,
  zip_
} from "@effect-ts/system/Array"
