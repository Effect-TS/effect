import type { RecordURI } from "../Modules"
import type { URI } from "../Prelude"
import * as P from "../Prelude"
import type { V } from "./definition"
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
} from "./operations"

export const Covariant = P.instance<P.Covariant<[URI<RecordURI>], V>>({
  map
})

export const CovariantWithIndex = P.instance<P.CovariantWithIndex<[URI<RecordURI>], V>>(
  {
    mapWithIndex
  }
)

export const ForEach = P.instance<P.ForEach<[URI<RecordURI>], V>>({
  map,
  forEachF
})

export const ForEachWithIndex = P.instance<P.ForEachWithIndex<[URI<RecordURI>], V>>({
  map,
  forEachWithIndexF
})

export const Reduce = P.instance<P.Reduce<[URI<RecordURI>], V>>({
  reduce
})

export const ReduceRight = P.instance<P.ReduceRight<[URI<RecordURI>], V>>({
  reduceRight
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<[URI<RecordURI>], V>>({
  reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<
  P.ReduceRightWithIndex<[URI<RecordURI>], V>
>({
  reduceRightWithIndex
})

export const FoldMap = P.instance<P.FoldMap<[URI<RecordURI>], V>>({
  foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<[URI<RecordURI>], V>>({
  foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<[URI<RecordURI>], V>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const FoldableWithIndex = P.instance<P.FoldableWithIndex<[URI<RecordURI>], V>>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})

export const Wiltable = P.instance<P.Wiltable<[URI<RecordURI>], V>>({
  separateF
})

export const WiltableWithIndex = P.instance<P.WiltableWithIndex<[URI<RecordURI>], V>>({
  separateWithIndexF
})

export const Witherable = P.instance<P.Witherable<[URI<RecordURI>], V>>({
  compactF
})

export const WitherableWithIndex = P.instance<
  P.WitherableWithIndex<[URI<RecordURI>], V>
>({
  compactWithIndexF
})

export const Compact = P.instance<P.Compact<[URI<RecordURI>], V>>({
  compact
})

export const Separate = P.instance<P.Separate<[URI<RecordURI>], V>>({
  separate
})

export const Compactable = P.instance<P.Compactable<[URI<RecordURI>], V>>({
  ...Separate,
  ...Compact
})
