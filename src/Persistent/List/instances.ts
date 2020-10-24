import type { ListURI } from "../../Modules"
import * as P from "../../Prelude"
import * as L from "./operations"

export const Any = P.instance<P.Any<[ListURI]>>({
  any: () => L.of({})
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[ListURI]>>({
  both: L.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[ListURI]>>({
  flatten: L.flatten
})

export const Covariant = P.instance<P.Covariant<[ListURI]>>({
  map: L.map
})

export const Applicative = P.instance<P.Applicative<[ListURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[ListURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const Traversable = P.instance<P.Traversable<[ListURI]>>({
  map: L.map,
  foreachF: L.foreachF
})

export const Wiltable = P.instance<P.Wiltable<[ListURI]>>({
  separateF: L.separateF
})

export const Witherable = P.instance<P.Witherable<[ListURI]>>({
  compactF: L.compactF
})

export const Compact = P.instance<P.Compact<[ListURI]>>({
  compact: L.compact
})

export const Separate = P.instance<P.Separate<[ListURI]>>({
  separate: L.separate
})

export const Reduce = P.instance<P.Reduce<[ListURI]>>({
  reduce: L.reduce
})

export const ReduceRight = P.instance<P.ReduceRight<[ListURI]>>({
  reduceRight: L.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<[ListURI]>>({
  foldMap: L.foldMap
})

export const Foldable = P.instance<P.Foldable<[ListURI]>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const Filter = P.instance<P.Filter<[ListURI]>>({
  filter: L.filter
})

export const FilterMap = P.instance<P.FilterMap<[ListURI]>>({
  filterMap: L.filterMap
})

export const Partition = P.instance<P.Partition<[ListURI]>>({
  partition: L.partition
})

export const PartitionMap = P.instance<P.PartitionMap<[ListURI]>>({
  partitionMap: L.partitionMap
})

export const Filterable = P.instance<P.Filterable<[ListURI]>>({
  ...Filter,
  ...FilterMap,
  ...Partition,
  ...PartitionMap
})
