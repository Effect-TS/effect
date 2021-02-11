import type { ArrayURI } from "../Modules"
import type { URI } from "../Prelude"
import * as P from "../Prelude"
import * as A from "./operations"

export const Any = P.instance<P.Any<URI<ArrayURI>>>({
  any: () => [{}]
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<URI<ArrayURI>>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<URI<ArrayURI>>>({
  flatten: A.flatten
})

export const Covariant = P.instance<P.Covariant<URI<ArrayURI>>>({
  map: A.map
})

export const Applicative = P.instance<P.Applicative<URI<ArrayURI>>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<URI<ArrayURI>>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const ForEach = P.instance<P.ForEach<URI<ArrayURI>>>({
  map: A.map,
  forEachF: A.forEachF
})

export const ForEachWithIndex = P.instance<P.ForEachWithIndex<URI<ArrayURI>>>({
  map: A.map,
  forEachWithIndexF: A.forEachWithIndexF
})

export const Wiltable = P.instance<P.Wiltable<URI<ArrayURI>>>({
  separateF: A.separateF
})

export const WiltableWithIndex = P.instance<P.WiltableWithIndex<URI<ArrayURI>>>({
  separateWithIndexF: A.separateWithIndexF
})

export const Witherable = P.instance<P.Witherable<URI<ArrayURI>>>({
  compactF: A.compactF
})

export const WitherableWithIndex = P.instance<P.WitherableWithIndex<URI<ArrayURI>>>({
  compactWithIndexF: A.compactWithIndexF
})

export const Compact = P.instance<P.Compact<URI<ArrayURI>>>({
  compact: A.compact
})

export const Separate = P.instance<P.Separate<URI<ArrayURI>>>({
  separate: A.separate
})

export const Extend = P.instance<P.Extend<URI<ArrayURI>>>({
  extend: A.extend
})

export const Reduce = P.instance<P.Reduce<URI<ArrayURI>>>({
  reduce: A.reduce
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<URI<ArrayURI>>>({
  reduceWithIndex: A.reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<P.ReduceRightWithIndex<URI<ArrayURI>>>({
  reduceRightWithIndex: A.reduceRightWithIndex
})

export const ReduceRight = P.instance<P.ReduceRight<URI<ArrayURI>>>({
  reduceRight: A.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<URI<ArrayURI>>>({
  foldMap: A.foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<URI<ArrayURI>>>({
  foldMapWithIndex: A.foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<URI<ArrayURI>>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const FoldableWithIndex = P.instance<P.FoldableWithIndex<URI<ArrayURI>>>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})

export const Filter = P.instance<P.Filter<URI<ArrayURI>>>({
  filter: A.filter
})

export const FilterWithIndex = P.instance<P.FilterWithIndex<URI<ArrayURI>>>({
  filterWithIndex: A.filterWithIndex
})

export const FilterMap = P.instance<P.FilterMap<URI<ArrayURI>>>({
  filterMap: A.filterMap
})

export const FilterMapWithIndex = P.instance<P.FilterMapWithIndex<URI<ArrayURI>>>({
  filterMapWithIndex: A.filterMapWithIndex
})

export const Partition = P.instance<P.Partition<URI<ArrayURI>>>({
  partition: A.partition
})

export const PartitionWithIndex = P.instance<P.PartitionWithIndex<URI<ArrayURI>>>({
  partitionWithIndex: A.partitionWithIndex
})

export const PartitionMap = P.instance<P.PartitionMap<URI<ArrayURI>>>({
  partitionMap: A.partitionMap
})

export const PartitionMapWithIndex = P.instance<P.PartitionMapWithIndex<URI<ArrayURI>>>(
  {
    partitionMapWithIndex: A.partitionMapWithIndex
  }
)

export const Filterable = P.instance<P.Filterable<URI<ArrayURI>>>({
  ...Filter,
  ...FilterMap,
  ...Partition,
  ...PartitionMap
})

export const FilterableWithIndex = P.instance<P.FilterableWithIndex<URI<ArrayURI>>>({
  ...FilterWithIndex,
  ...FilterMapWithIndex,
  ...PartitionWithIndex,
  ...PartitionMapWithIndex
})
