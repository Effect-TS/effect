import type { ArrayURI } from "../../Modules"
import * as P from "../../Prelude"
import * as A from "./operations"

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

export const Applicative = P.instance<P.Applicative<[ArrayURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[ArrayURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const Traversable = P.instance<P.Traversable<[ArrayURI]>>({
  map: A.map,
  foreachF: A.foreachF
})

export const TraversableWithIndex = P.instance<P.TraversableWithIndex<[ArrayURI]>>({
  map: A.map,
  foreachWithIndexF: A.foreachWithIndexF
})

export const Wiltable = P.instance<P.Wiltable<[ArrayURI]>>({
  separateF: A.separateF
})

export const Witherable = P.instance<P.Witherable<[ArrayURI]>>({
  compactF: A.compactF
})

export const WitherableWithIndex = P.instance<P.WitherableWithIndex<[ArrayURI]>>({
  compactWithIndexF: A.compactWithIndexF
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

export const Reduce = P.instance<P.Reduce<[ArrayURI]>>({
  reduce: A.reduce
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<[ArrayURI]>>({
  reduceWithIndex: A.reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<P.ReduceRightWithIndex<[ArrayURI]>>({
  reduceRightWithIndex: A.reduceRightWithIndex
})

export const ReduceRight = P.instance<P.ReduceRight<[ArrayURI]>>({
  reduceRight: A.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<[ArrayURI]>>({
  foldMap: A.foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<[ArrayURI]>>({
  foldMapWithIndex: A.foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<[ArrayURI]>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})
export const FoldableWithIndex = P.instance<P.FoldableWithIndex<[ArrayURI]>>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})
