// ets_tracing: off

import type { NonEmptyArrayURI } from "../../../Modules/index.js"
import type { URI } from "../../../Prelude/index.js"
import * as P from "../../../Prelude/index.js"
import * as A from "./operations.js"

export const Any = P.instance<P.Any<[URI<NonEmptyArrayURI>]>>({
  any: () => [{}]
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<NonEmptyArrayURI>]>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<
  P.AssociativeFlatten<[URI<NonEmptyArrayURI>]>
>({
  flatten: A.flatten
})

export const Covariant = P.instance<P.Covariant<[URI<NonEmptyArrayURI>]>>({
  map: A.map
})

export const Applicative = P.instance<P.Applicative<[URI<NonEmptyArrayURI>]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[URI<NonEmptyArrayURI>]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const ForEach = P.instance<P.ForEach<[URI<NonEmptyArrayURI>]>>({
  map: A.map,
  forEachF: A.forEachF
})

export const ForEachWithIndex = P.instance<P.ForEachWithIndex<[URI<NonEmptyArrayURI>]>>(
  {
    map: A.map,
    forEachWithIndexF: A.forEachWithIndexF
  }
)

export const Extend = P.instance<P.Extend<[URI<NonEmptyArrayURI>]>>({
  extend: A.extend
})

export const Reduce = P.instance<P.Reduce<[URI<NonEmptyArrayURI>]>>({
  reduce: A.reduce
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<[URI<NonEmptyArrayURI>]>>({
  reduceWithIndex: A.reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<
  P.ReduceRightWithIndex<[URI<NonEmptyArrayURI>]>
>({
  reduceRightWithIndex: A.reduceRightWithIndex
})

export const ReduceRight = P.instance<P.ReduceRight<[URI<NonEmptyArrayURI>]>>({
  reduceRight: A.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<[URI<NonEmptyArrayURI>]>>({
  foldMap: A.foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<[URI<NonEmptyArrayURI>]>>(
  {
    foldMapWithIndex: A.foldMapWithIndex
  }
)

export const Foldable = P.instance<P.Foldable<[URI<NonEmptyArrayURI>]>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})
export const FoldableWithIndex = P.instance<
  P.FoldableWithIndex<[URI<NonEmptyArrayURI>]>
>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})
