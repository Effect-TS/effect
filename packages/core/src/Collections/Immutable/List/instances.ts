// ets_tracing: off

import * as P from "../../../PreludeV2/index.js"
import * as L from "./operations.js"

export interface ListF extends P.HKT {
  readonly type: L.List<this["A"]>
}

export const Any = P.instance<P.Any<ListF>>({
  any: () => L.of({})
})

export const AssociativeBothZip = P.instance<P.AssociativeBoth<ListF>>({
  both: L.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<ListF>>({
  flatten: L.flatten
})

export const Covariant = P.instance<P.Covariant<ListF>>({
  map: L.map
})

export const Monad = P.instance<P.Monad<ListF>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const Applicative = P.getApplicativeF(Monad)

export const ApplyZip = P.instance<P.Apply<ListF>>({
  ...Covariant,
  ...AssociativeBothZip
})

export const ForEach = P.instance<P.ForEach<ListF>>({
  map: L.map,
  forEachF: L.forEachF
})

export const Wiltable = P.instance<P.Wiltable<ListF>>({
  separateF: L.separateF
})

export const Witherable = P.instance<P.Witherable<ListF>>({
  compactF: L.compactF
})

export const Compact = P.instance<P.Compact<ListF>>({
  compact: L.compact
})

export const Separate = P.instance<P.Separate<ListF>>({
  separate: L.separate
})

export const Reduce = P.instance<P.Reduce<ListF>>({
  reduce: L.reduce
})

export const ReduceRight = P.instance<P.ReduceRight<ListF>>({
  reduceRight: L.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<ListF>>({
  foldMap: L.foldMap
})

export const Foldable = P.instance<P.Foldable<ListF>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const Filter = P.instance<P.Filter<ListF>>({
  filter: L.filter
})

export const FilterMap = P.instance<P.FilterMap<ListF>>({
  filterMap: L.filterMap
})

export const Partition = P.instance<P.Partition<ListF>>({
  partition: L.partition
})

export const PartitionMap = P.instance<P.PartitionMap<ListF>>({
  partitionMap: L.partitionMap
})

export const Filterable = P.instance<P.Filterable<ListF>>({
  ...Filter,
  ...FilterMap,
  ...Partition,
  ...PartitionMap
})

export const Collection = P.instance<P.Collection<ListF>>({
  builder: L.builder
})
