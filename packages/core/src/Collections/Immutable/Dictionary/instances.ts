// ets_tracing: off

import * as P from "../../../PreludeV2/index.js"
import type { Dictionary } from "./operations.js"
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

export interface DictionaryF extends P.HKT {
  readonly type: Dictionary<this["A"]>
}

export const Covariant = P.instance<P.Covariant<DictionaryF>>({
  map
})

export const CovariantWithIndex = P.instance<P.CovariantWithIndex<string, DictionaryF>>(
  {
    mapWithIndex
  }
)

export const ForEach = P.instance<P.ForEach<DictionaryF>>({
  map,
  forEachF
})

export const ForEachWithIndex = P.instance<P.ForEachWithIndex<string, DictionaryF>>({
  map,
  forEachWithIndexF
})

export const Reduce = P.instance<P.Reduce<DictionaryF>>({
  reduce
})

export const ReduceRight = P.instance<P.ReduceRight<DictionaryF>>({
  reduceRight
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<string, DictionaryF>>({
  reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<
  P.ReduceRightWithIndex<string, DictionaryF>
>({
  reduceRightWithIndex
})

export const FoldMap = P.instance<P.FoldMap<DictionaryF>>({
  foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<string, DictionaryF>>({
  foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<DictionaryF>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const FoldableWithIndex = P.instance<P.FoldableWithIndex<string, DictionaryF>>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})

export const Wiltable = P.instance<P.Wiltable<DictionaryF>>({
  separateF
})

export const WiltableWithIndex = P.instance<P.WiltableWithIndex<string, DictionaryF>>({
  separateWithIndexF
})

export const Witherable = P.instance<P.Witherable<DictionaryF>>({
  compactF
})

export const WitherableWithIndex = P.instance<
  P.WitherableWithIndex<string, DictionaryF>
>({
  compactWithIndexF
})

export const Compact = P.instance<P.Compact<DictionaryF>>({
  compact
})

export const Separate = P.instance<P.Separate<DictionaryF>>({
  separate
})

export const Compactable = P.instance<P.Compactable<DictionaryF>>({
  ...Separate,
  ...Compact
})
