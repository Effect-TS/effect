import type { RecordURI } from "../Modules"
import * as P from "../Prelude"
import type { V } from "./definition"
import {
  compact,
  compactF,
  compactWithIndexF,
  foldMap,
  foldMapWithIndex,
  foreachF,
  foreachWithIndexF,
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

export const Covariant = P.instance<P.Covariant<[RecordURI], V>>({
  map
})

export const CovariantWithIndex = P.instance<P.CovariantWithIndex<[RecordURI], V>>({
  mapWithIndex
})

export const Traversable = P.instance<P.Traversable<[RecordURI], V>>({
  map,
  foreachF
})

export const TraversableWithIndex = P.instance<P.TraversableWithIndex<[RecordURI], V>>({
  map,
  foreachWithIndexF
})

export const Reduce = P.instance<P.Reduce<[RecordURI], V>>({
  reduce
})

export const ReduceRight = P.instance<P.ReduceRight<[RecordURI], V>>({
  reduceRight
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<[RecordURI], V>>({
  reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<P.ReduceRightWithIndex<[RecordURI], V>>({
  reduceRightWithIndex
})

export const FoldMap = P.instance<P.FoldMap<[RecordURI], V>>({
  foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<[RecordURI], V>>({
  foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<[RecordURI], V>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const FoldableWithIndex = P.instance<P.FoldableWithIndex<[RecordURI], V>>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})

export const Wiltable = P.instance<P.Wiltable<[RecordURI], V>>({
  separateF
})

export const WiltableWithIndex = P.instance<P.WiltableWithIndex<[RecordURI], V>>({
  separateWithIndexF
})

export const Witherable = P.instance<P.Witherable<[RecordURI], V>>({
  compactF
})

export const WitherableWithIndex = P.instance<P.WitherableWithIndex<[RecordURI], V>>({
  compactWithIndexF
})

export const Compact = P.instance<P.Compact<[RecordURI], V>>({
  compact
})

export const Separate = P.instance<P.Separate<[RecordURI], V>>({
  separate
})

export const Compactable = P.instance<P.Compactable<[RecordURI], V>>({
  ...Separate,
  ...Compact
})
