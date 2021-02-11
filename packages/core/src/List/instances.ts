import * as P from "../Prelude"
import * as L from "./operations"

export const Any = P.instance<P.Any<[L.ListURI]>>({
  any: () => L.of({})
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[L.ListURI]>>({
  both: L.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[L.ListURI]>>({
  flatten: L.flatten
})

export const Covariant = P.instance<P.Covariant<[L.ListURI]>>({
  map: L.map
})

export const Applicative = P.instance<P.Applicative<[L.ListURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[L.ListURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const ForEach = P.instance<P.ForEach<[L.ListURI]>>({
  map: L.map,
  forEachF: L.forEachF
})

export const Wiltable = P.instance<P.Wiltable<[L.ListURI]>>({
  separateF: L.separateF
})

export const Witherable = P.instance<P.Witherable<[L.ListURI]>>({
  compactF: L.compactF
})

export const Compact = P.instance<P.Compact<[L.ListURI]>>({
  compact: L.compact
})

export const Separate = P.instance<P.Separate<[L.ListURI]>>({
  separate: L.separate
})

export const Reduce = P.instance<P.Reduce<[L.ListURI]>>({
  reduce: L.reduce
})

export const ReduceRight = P.instance<P.ReduceRight<[L.ListURI]>>({
  reduceRight: L.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<[L.ListURI]>>({
  foldMap: L.foldMap
})

export const Foldable = P.instance<P.Foldable<[L.ListURI]>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const Filter = P.instance<P.Filter<[L.ListURI]>>({
  filter: L.filter
})

export const FilterMap = P.instance<P.FilterMap<[L.ListURI]>>({
  filterMap: L.filterMap
})

export const Partition = P.instance<P.Partition<[L.ListURI]>>({
  partition: L.partition
})

export const PartitionMap = P.instance<P.PartitionMap<[L.ListURI]>>({
  partitionMap: L.partitionMap
})

export const Filterable = P.instance<P.Filterable<[L.ListURI]>>({
  ...Filter,
  ...FilterMap,
  ...Partition,
  ...PartitionMap
})
