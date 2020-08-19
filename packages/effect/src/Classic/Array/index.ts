/**
 * @since 1.0.0
 */
import * as P from "../../Prelude"

import * as A from "@effect-ts/system/Array"
import { pipe } from "@effect-ts/system/Function"

/**
 * @since 1.0.0
 */
export const ArrayURI = "ArrayURI"

/**
 * @since 1.0.0
 */
export type ArrayURI = typeof ArrayURI

declare module "../../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [ArrayURI]: A.Array<A>
  }
}

/**
 * @since 1.0.0
 */
export const Any: P.Any<ArrayURI> = {
  F: ArrayURI,
  any: () => []
}

/**
 * @since 1.0.0
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<ArrayURI>>({
  both: A.zip
})

/**
 * @since 1.0.0
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<ArrayURI>>({
  flatten: A.flatten
})

/**
 * @since 1.0.0
 */
export const Covariant = P.instance<P.Covariant<ArrayURI>>({
  map: A.map
})

/**
 * @since 1.0.0
 */
export const Applicative: P.Applicative<ArrayURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

/**
 * @since 1.0.0
 */
export const Monad: P.Monad<ArrayURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
}

/**
 * @since 1.0.0
 */
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

/**
 * @since 1.0.0
 */
export const Traversable = P.instance<P.Traversable<ArrayURI>>({
  map: A.map,
  foreachF
})

export {
  /**
   * @since 1.0.0
   */
  ap,
  /**
   * @since 1.0.0
   */
  ap_,
  /**
   * @since 1.0.0
   */
  Array,
  /**
   * @since 1.0.0
   */
  chain,
  /**
   * @since 1.0.0
   */
  chain_,
  /**
   * @since 1.0.0
   */
  chop,
  /**
   * @since 1.0.0
   */
  chop_,
  /**
   * @since 1.0.0
   */
  chunksOf,
  /**
   * @since 1.0.0
   */
  chunksOf_,
  /**
   * @since 1.0.0
   */
  compact,
  /**
   * @since 1.0.0
   */
  comprehension,
  /**
   * @since 1.0.0
   */
  concat,
  /**
   * @since 1.0.0
   */
  concat_,
  /**
   * @since 1.0.0
   */
  cons,
  /**
   * @since 1.0.0
   */
  cons_,
  /**
   * @since 1.0.0
   */
  deleteAt,
  /**
   * @since 1.0.0
   */
  deleteAt_,
  /**
   * @since 1.0.0
   */
  dropLeft,
  /**
   * @since 1.0.0
   */
  dropLeftWhile,
  /**
   * @since 1.0.0
   */
  dropLeftWhile_,
  /**
   * @since 1.0.0
   */
  dropLeft_,
  /**
   * @since 1.0.0
   */
  dropRight,
  /**
   * @since 1.0.0
   */
  dropRight_,
  /**
   * @since 1.0.0
   */
  duplicate,
  /**
   * @since 1.0.0
   */
  empty,
  /**
   * @since 1.0.0
   */
  extend,
  /**
   * @since 1.0.0
   */
  extend_,
  /**
   * @since 1.0.0
   */
  filter,
  /**
   * @since 1.0.0
   */
  filterMap,
  /**
   * @since 1.0.0
   */
  filterMapWithIndex,
  /**
   * @since 1.0.0
   */
  filterMapWithIndex_,
  /**
   * @since 1.0.0
   */
  filterMap_,
  /**
   * @since 1.0.0
   */
  filterWithIndex,
  /**
   * @since 1.0.0
   */
  filterWithIndex_,
  /**
   * @since 1.0.0
   */
  filter_,
  /**
   * @since 1.0.0
   */
  findFirst,
  /**
   * @since 1.0.0
   */
  findFirstMap,
  /**
   * @since 1.0.0
   */
  findFirstMap_,
  /**
   * @since 1.0.0
   */
  findFirst_,
  /**
   * @since 1.0.0
   */
  findIndex,
  /**
   * @since 1.0.0
   */
  findIndex_,
  /**
   * @since 1.0.0
   */
  findLast,
  /**
   * @since 1.0.0
   */
  findLastIndex,
  /**
   * @since 1.0.0
   */
  findLastIndex_,
  /**
   * @since 1.0.0
   */
  findLastMap,
  /**
   * @since 1.0.0
   */
  findLastMap_,
  /**
   * @since 1.0.0
   */
  findLast_,
  /**
   * @since 1.0.0
   */
  flatten,
  /**
   * @since 1.0.0
   */
  foldLeft,
  /**
   * @since 1.0.0
   */
  foldLeft_,
  /**
   * @since 1.0.0
   */
  foldRight,
  /**
   * @since 1.0.0
   */
  foldRight_,
  /**
   * @since 1.0.0
   */
  fromMutable,
  /**
   * @since 1.0.0
   */
  head,
  /**
   * @since 1.0.0
   */
  init,
  /**
   * @since 1.0.0
   */
  insertAt,
  /**
   * @since 1.0.0
   */
  insertAt_,
  /**
   * @since 1.0.0
   */
  isEmpty,
  /**
   * @since 1.0.0
   */
  isNonEmpty,
  /**
   * @since 1.0.0
   */
  isOutOfBound,
  /**
   * @since 1.0.0
   */
  last,
  /**
   * @since 1.0.0
   */
  lefts,
  /**
   * @since 1.0.0
   */
  lookup,
  /**
   * @since 1.0.0
   */
  lookup_,
  /**
   * @since 1.0.0
   */
  makeBy,
  /**
   * @since 1.0.0
   */
  makeBy_,
  /**
   * @since 1.0.0
   */
  map,
  /**
   * @since 1.0.0
   */
  mapWithIndex,
  /**
   * @since 1.0.0
   */
  mapWithIndex_,
  /**
   * @since 1.0.0
   */
  map_,
  /**
   * @since 1.0.0
   */
  modifyAt,
  /**
   * @since 1.0.0
   */
  modifyAt_,
  /**
   * @since 1.0.0
   */
  range,
  /**
   * @since 1.0.0
   */
  reduce,
  /**
   * @since 1.0.0
   */
  reduceRight,
  /**
   * @since 1.0.0
   */
  reduceRightWithIndex,
  /**
   * @since 1.0.0
   */
  reduceRightWithIndex_,
  /**
   * @since 1.0.0
   */
  reduceRight_,
  /**
   * @since 1.0.0
   */
  reduceWithIndex,
  /**
   * @since 1.0.0
   */
  reduceWithIndex_,
  /**
   * @since 1.0.0
   */
  reduce_,
  /**
   * @since 1.0.0
   */
  replicate,
  /**
   * @since 1.0.0
   */
  replicate_,
  /**
   * @since 1.0.0
   */
  reverse,
  /**
   * @since 1.0.0
   */
  rights,
  /**
   * @since 1.0.0
   */
  rotate,
  /**
   * @since 1.0.0
   */
  rotate_,
  /**
   * @since 1.0.0
   */
  scanLeft,
  /**
   * @since 1.0.0
   */
  scanLeft_,
  /**
   * @since 1.0.0
   */
  scanRight,
  /**
   * @since 1.0.0
   */
  scanRight_,
  /**
   * @since 1.0.0
   */
  separate,
  /**
   * @since 1.0.0
   */
  single,
  /**
   * @since 1.0.0
   */
  snoc,
  /**
   * @since 1.0.0
   */
  snoc_,
  /**
   * @since 1.0.0
   */
  spanIndex_,
  /**
   * @since 1.0.0
   */
  spanLeft,
  /**
   * @since 1.0.0
   */
  spanLeft_,
  /**
   * @since 1.0.0
   */
  Spanned,
  /**
   * @since 1.0.0
   */
  splitAt,
  /**
   * @since 1.0.0
   */
  splitAt_,
  /**
   * @since 1.0.0
   */
  tail,
  /**
   * @since 1.0.0
   */
  takeLeft,
  /**
   * @since 1.0.0
   */
  takeLeftWhile,
  /**
   * @since 1.0.0
   */
  takeLeftWhile_,
  /**
   * @since 1.0.0
   */
  takeLeft_,
  /**
   * @since 1.0.0
   */
  takeRight,
  /**
   * @since 1.0.0
   */
  takeRight_,
  /**
   * @since 1.0.0
   */
  tap,
  /**
   * @since 1.0.0
   */
  tap_,
  /**
   * @since 1.0.0
   */
  toMutable,
  /**
   * @since 1.0.0
   */
  unfold,
  /**
   * @since 1.0.0
   */
  unfold_,
  /**
   * @since 1.0.0
   */
  unsafeDeleteAt,
  /**
   * @since 1.0.0
   */
  unsafeDeleteAt_,
  /**
   * @since 1.0.0
   */
  unsafeInsertAt,
  /**
   * @since 1.0.0
   */
  unsafeInsertAt_,
  /**
   * @since 1.0.0
   */
  unsafeUpdateAt,
  /**
   * @since 1.0.0
   */
  unsafeUpdateAt_,
  /**
   * @since 1.0.0
   */
  unzip,
  /**
   * @since 1.0.0
   */
  updateAt,
  /**
   * @since 1.0.0
   */
  updateAt_,
  /**
   * @since 1.0.0
   */
  zip,
  /**
   * @since 1.0.0
   */
  zipWith,
  /**
   * @since 1.0.0
   */
  zipWith_,
  /**
   * @since 1.0.0
   */
  zip_
} from "@effect-ts/system/Array"
