// ets_tracing: off

import * as P from "../../../Prelude/index.js"
import * as A from "./operations.js"

export interface NonEmptyArrayF extends P.HKT {
  readonly type: A.NonEmptyArray<this["A"]>
}
export const Any = P.instance<P.Any<NonEmptyArrayF>>({
  any: () => [{}]
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<NonEmptyArrayF>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<NonEmptyArrayF>>({
  flatten: A.flatten
})

export const Covariant = P.instance<P.Covariant<NonEmptyArrayF>>({
  map: A.map
})

export const Applicative = P.instance<P.Applicative<NonEmptyArrayF>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<NonEmptyArrayF>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const ForEach = P.instance<P.ForEach<NonEmptyArrayF>>({
  map: A.map,
  forEachF: A.forEachF
})

export const ForEachWithIndex = P.instance<P.ForEachWithIndex<number, NonEmptyArrayF>>({
  map: A.map,
  forEachWithIndexF: A.forEachWithIndexF
})

export const Extend = P.instance<P.Extend<NonEmptyArrayF>>({
  extend: A.extend
})

export const Reduce = P.instance<P.Reduce<NonEmptyArrayF>>({
  reduce: A.reduce
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<number, NonEmptyArrayF>>({
  reduceWithIndex: A.reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<
  P.ReduceRightWithIndex<number, NonEmptyArrayF>
>({
  reduceRightWithIndex: A.reduceRightWithIndex
})

export const ReduceRight = P.instance<P.ReduceRight<NonEmptyArrayF>>({
  reduceRight: A.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<NonEmptyArrayF>>({
  foldMap: A.foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<number, NonEmptyArrayF>>({
  foldMapWithIndex: A.foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<NonEmptyArrayF>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})
export const FoldableWithIndex = P.instance<
  P.FoldableWithIndex<number, NonEmptyArrayF>
>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})
