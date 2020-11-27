/**
 * tracing: off
 */
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

export const WiltableWithIndex = P.instance<P.WiltableWithIndex<[ArrayURI]>>({
  separateWithIndexF: A.separateWithIndexF
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

export const Filter = P.instance<P.Filter<[ArrayURI]>>({
  filter: A.filter
})

export const FilterWithIndex = P.instance<P.FilterWithIndex<[ArrayURI]>>({
  filterWithIndex: A.filterWithIndex
})

export const FilterMap = P.instance<P.FilterMap<[ArrayURI]>>({
  filterMap: A.filterMap
})

export const FilterMapWithIndex = P.instance<P.FilterMapWithIndex<[ArrayURI]>>({
  filterMapWithIndex: A.filterMapWithIndex
})

export const Partition = P.instance<P.Partition<[ArrayURI]>>({
  partition: A.partition
})

export const PartitionWithIndex = P.instance<P.PartitionWithIndex<[ArrayURI]>>({
  partitionWithIndex: A.partitionWithIndex
})

export const PartitionMap = P.instance<P.PartitionMap<[ArrayURI]>>({
  partitionMap: A.partitionMap
})

export const PartitionMapWithIndex = P.instance<P.PartitionMapWithIndex<[ArrayURI]>>({
  partitionMapWithIndex: A.partitionMapWithIndex
})

export const Filterable = P.instance<P.Filterable<[ArrayURI]>>({
  ...Filter,
  ...FilterMap,
  ...Partition,
  ...PartitionMap
})

export const FilterableWithIndex = P.instance<P.FilterableWithIndex<[ArrayURI]>>({
  ...FilterWithIndex,
  ...FilterMapWithIndex,
  ...PartitionWithIndex,
  ...PartitionMapWithIndex
})
