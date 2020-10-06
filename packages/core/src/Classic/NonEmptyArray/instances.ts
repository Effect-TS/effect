import type { NonEmptyArrayURI } from "../../Modules"
import * as P from "../../Prelude"
import * as A from "./operations"

export const Any = P.instance<P.Any<[NonEmptyArrayURI]>>({
  any: () => [{}]
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[NonEmptyArrayURI]>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[NonEmptyArrayURI]>>({
  flatten: A.flatten
})

export const Covariant = P.instance<P.Covariant<[NonEmptyArrayURI]>>({
  map: A.map
})

export const Applicative = P.instance<P.Applicative<[NonEmptyArrayURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[NonEmptyArrayURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const Traversable = P.instance<P.Traversable<[NonEmptyArrayURI]>>({
  map: A.map,
  foreachF: A.foreachF
})

export const TraversableWithIndex = P.instance<
  P.TraversableWithIndex<[NonEmptyArrayURI]>
>({
  map: A.map,
  foreachWithIndexF: A.foreachWithIndexF
})

export const Extend = P.instance<P.Extend<[NonEmptyArrayURI]>>({
  extend: A.extend
})

export const Reduce = P.instance<P.Reduce<[NonEmptyArrayURI]>>({
  reduce: A.reduce
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<[NonEmptyArrayURI]>>({
  reduceWithIndex: A.reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<
  P.ReduceRightWithIndex<[NonEmptyArrayURI]>
>({
  reduceRightWithIndex: A.reduceRightWithIndex
})

export const ReduceRight = P.instance<P.ReduceRight<[NonEmptyArrayURI]>>({
  reduceRight: A.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<[NonEmptyArrayURI]>>({
  foldMap: A.foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<[NonEmptyArrayURI]>>({
  foldMapWithIndex: A.foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<[NonEmptyArrayURI]>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})
export const FoldableWithIndex = P.instance<P.FoldableWithIndex<[NonEmptyArrayURI]>>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})
