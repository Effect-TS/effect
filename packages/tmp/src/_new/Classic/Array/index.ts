import * as A from "@effect-ts/system/Array"

import { pipe } from "../../../Function"
import * as P from "../../Prelude"

export const ArrayURI = "ArrayURI"
export type ArrayURI = typeof ArrayURI

declare module "../../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [ArrayURI]: A.Array<A>
  }
}

export const Any: P.Any<ArrayURI> = {
  F: ArrayURI,
  any: () => []
}

export const AssociativeBoth = P.instance<P.AssociativeBoth<ArrayURI>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<ArrayURI>>({
  flatten: A.flatten
})

export const Covariant = P.instance<P.Covariant<ArrayURI>>({
  map: A.map
})

export const Applicative: P.Applicative<ArrayURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

export const Monad: P.Monad<ArrayURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
}

export const foreachF = P.implementForeachF<ArrayURI>()((_) => (G) => (f) =>
  A.reduce(
    pipe(
      G.any(),
      G.map(() => [] as typeof _.B[])
    ),
    (b, a) =>
      pipe(
        b,
        G.both(f(a)),
        G.map(([x, y]) => {
          x.push(y)
          return x
        })
      )
  )
)

export const Traversable = P.instance<P.Traversable<ArrayURI>>({
  map: A.map,
  foreachF
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
