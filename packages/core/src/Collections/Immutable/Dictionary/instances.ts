// ets_tracing: off

import type { DictionaryURI } from "../../../Modules/index.js"
import type { URI } from "../../../Prelude/index.js"
import * as P from "../../../Prelude/index.js"
import {
  compact,
  compactF,
  compactWithIndexF,
  foldMap,
  foldMapWithIndex,
  forEachF,
  forEachWithIndexF,
  map,
  mapWithIndex,
  reduce,
  reduceRight,
  reduceRightWithIndex,
  reduceWithIndex,
  separate,
  separateF,
  separateWithIndexF
} from "./operations.js"

export const Covariant = P.instance<P.Covariant<[URI<DictionaryURI>]>>({
  map
})

export const CovariantWithIndex = P.instance<
  P.CovariantWithIndex<[URI<DictionaryURI>]>
>({
  mapWithIndex
})

export const ForEach = P.instance<P.ForEach<[URI<DictionaryURI>]>>({
  map,
  forEachF
})

export const ForEachWithIndex = P.instance<P.ForEachWithIndex<[URI<DictionaryURI>]>>({
  map,
  forEachWithIndexF
})

export const Reduce = P.instance<P.Reduce<[URI<DictionaryURI>]>>({
  reduce
})

export const ReduceRight = P.instance<P.ReduceRight<[URI<DictionaryURI>]>>({
  reduceRight
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<[URI<DictionaryURI>]>>({
  reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<
  P.ReduceRightWithIndex<[URI<DictionaryURI>]>
>({
  reduceRightWithIndex
})

export const FoldMap = P.instance<P.FoldMap<[URI<DictionaryURI>]>>({
  foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<[URI<DictionaryURI>]>>({
  foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<[URI<DictionaryURI>]>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const FoldableWithIndex = P.instance<P.FoldableWithIndex<[URI<DictionaryURI>]>>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})

export const Wiltable = P.instance<P.Wiltable<[URI<DictionaryURI>]>>({
  separateF
})

export const WiltableWithIndex = P.instance<P.WiltableWithIndex<[URI<DictionaryURI>]>>({
  separateWithIndexF
})

export const Witherable = P.instance<P.Witherable<[URI<DictionaryURI>]>>({
  compactF
})

export const WitherableWithIndex = P.instance<
  P.WitherableWithIndex<[URI<DictionaryURI>]>
>({
  compactWithIndexF
})

export const Compact = P.instance<P.Compact<[URI<DictionaryURI>]>>({
  compact
})

export const Separate = P.instance<P.Separate<[URI<DictionaryURI>]>>({
  separate
})

export const Compactable = P.instance<P.Compactable<[URI<DictionaryURI>]>>({
  ...Separate,
  ...Compact
})
