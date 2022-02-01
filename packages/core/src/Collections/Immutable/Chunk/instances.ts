// ets_tracing: off

import type { Either } from "../../../Either/index.js"
import type { ChunkURI } from "../../../Modules/index.js"
import * as O from "../../../Option/index.js"
import type { URI } from "../../../Prelude/index.js"
import { getApplicativeF } from "../../../Prelude/index.js"
import * as P from "../../../Prelude/index.js"
import type { PredicateWithIndex } from "../../../Utils/index.js"
import * as Chunk from "./operations.js"

export const Collection = P.instance<P.Collection<[P.URI<ChunkURI>]>>({
  builder: Chunk.builder
})

export const Any = P.instance<P.Any<[URI<ChunkURI>]>>({
  any: () => Chunk.single({})
})

export const AssociativeBothZip = P.instance<P.AssociativeBoth<[URI<ChunkURI>]>>({
  both: Chunk.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<ChunkURI>]>>({
  flatten: Chunk.flatten
})

export const Covariant = P.instance<P.Covariant<[URI<ChunkURI>]>>({
  map: Chunk.map
})

export const ApplyZip = P.instance<P.Apply<[URI<ChunkURI>]>>({
  ...Covariant,
  ...AssociativeBothZip
})

export const Monad = P.instance<P.Monad<[URI<ChunkURI>]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const Applicative = getApplicativeF(Monad)

export const ForEach = P.instance<P.ForEach<[URI<ChunkURI>]>>({
  map: Chunk.map,
  forEachF: Chunk.forEachF
})

export const ForEachWithIndex = P.instance<P.ForEachWithIndex<[URI<ChunkURI>]>>({
  map: Chunk.map,
  forEachWithIndexF: Chunk.forEachWithIndexF
})

export const Wiltable = P.instance<P.Wiltable<[URI<ChunkURI>]>>({
  separateF: Chunk.separateF
})

export const WiltableWithIndex = P.instance<P.WiltableWithIndex<[URI<ChunkURI>]>>({
  separateWithIndexF: Chunk.separateWithIndexF
})

export const Witherable = P.instance<P.Witherable<[URI<ChunkURI>]>>({
  compactF: Chunk.compactF
})

export const WitherableWithIndex = P.instance<P.WitherableWithIndex<[URI<ChunkURI>]>>({
  compactWithIndexF: Chunk.compactWithIndexF
})

export const Compact = P.instance<P.Compact<[URI<ChunkURI>]>>({
  compact: Chunk.compact
})

export const Separate = P.instance<P.Separate<[URI<ChunkURI>]>>({
  separate: Chunk.separate
})

export const Extend = P.instance<P.Extend<[URI<ChunkURI>]>>({
  extend: (f) => (fa) => Chunk.single(f(fa))
})

export const Reduce = P.instance<P.Reduce<[URI<ChunkURI>]>>({
  reduce: Chunk.reduce
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<[URI<ChunkURI>]>>({
  reduceWithIndex: (b, f) => (fa) =>
    Chunk.reduce_(Chunk.zipWithIndex(fa), b, (b, { tuple: [a, i] }) => f(i, b, a))
})

export const ReduceRightWithIndex = P.instance<P.ReduceRightWithIndex<[URI<ChunkURI>]>>(
  {
    reduceRightWithIndex: (b, f) => (fa) =>
      Chunk.reduceRight_(Chunk.zipWithIndex(fa), b, ({ tuple: [a, i] }, b) =>
        f(i, a, b)
      )
  }
)

export const ReduceRight = P.instance<P.ReduceRight<[URI<ChunkURI>]>>({
  reduceRight: Chunk.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<[URI<ChunkURI>]>>({
  foldMap: Chunk.foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<[URI<ChunkURI>]>>({
  foldMapWithIndex: Chunk.foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<[URI<ChunkURI>]>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const FoldableWithIndex = P.instance<P.FoldableWithIndex<[URI<ChunkURI>]>>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})

export const Filter = P.instance<P.Filter<[URI<ChunkURI>]>>({
  filter: Chunk.filter
})

export const FilterWithIndex = P.instance<P.FilterWithIndex<[URI<ChunkURI>]>>({
  filterWithIndex:
    <A>(predicate: PredicateWithIndex<number, A>) =>
    (fa: Chunk.Chunk<A>): Chunk.Chunk<A> =>
      Chunk.collect_(Chunk.zipWithIndex(fa), ({ tuple: [a, i] }) =>
        predicate(i, a) ? O.some(a) : O.none
      )
})

export const FilterMap = P.instance<P.FilterMap<[URI<ChunkURI>]>>({
  filterMap: Chunk.collect
})

export const FilterMapWithIndex = P.instance<P.FilterMapWithIndex<[URI<ChunkURI>]>>({
  filterMapWithIndex: (f) => (fa) =>
    Chunk.collect_(Chunk.zipWithIndex(fa), ({ tuple: [a, i] }) => f(i, a))
})

export const Partition = P.instance<P.Partition<[URI<ChunkURI>]>>({
  partition: Chunk.partition
})

export const PartitionWithIndex = P.instance<P.PartitionWithIndex<[URI<ChunkURI>]>>({
  partitionWithIndex: Chunk.partitionWithIndex
})

export const PartitionMap = P.instance<P.PartitionMap<[URI<ChunkURI>]>>({
  partitionMap: Chunk.partitionMap
})

export const PartitionMapWithIndex = P.instance<
  P.PartitionMapWithIndex<[URI<ChunkURI>]>
>({
  partitionMapWithIndex: Chunk.partitionMapWithIndex
})

export const Filterable = P.instance<P.Filterable<[URI<ChunkURI>]>>({
  ...Filter,
  ...FilterMap,
  ...Partition,
  ...PartitionMap
})

export const FilterableWithIndex = P.instance<P.FilterableWithIndex<[URI<ChunkURI>]>>({
  ...FilterWithIndex,
  ...FilterMapWithIndex,
  ...PartitionWithIndex,
  ...PartitionMapWithIndex
})

/**
 * Exposing depth first recursion
 */
export const DepthFirstChainRec = P.instance<P.ChainRec<[URI<ChunkURI>]>>({
  chainRec:
    <A, B>(f: (a: A) => Chunk.Chunk<Either<A, B>>) =>
    (a: A): Chunk.Chunk<B> => {
      let todo = f(a)
      let result = Chunk.empty<B>()

      while (Chunk.size(todo) > 0) {
        const e = Chunk.unsafeHead(todo)
        todo = Chunk.unsafeTail(todo)

        if (e._tag === "Left") {
          todo = Chunk.concat_(f(e.left), todo)
        } else {
          result = Chunk.append_(result, e.right)
        }
      }

      return result
    }
})

export const depthFirstChainRec = DepthFirstChainRec.chainRec

/**
 * Exposing breadth first recursion
 */
export const BreadthFirstChainRec = P.instance<P.ChainRec<[URI<ChunkURI>]>>({
  chainRec:
    <A, B>(f: (a: A) => Chunk.Chunk<Either<A, B>>) =>
    (a: A): Chunk.Chunk<B> => {
      let todo = f(a)
      let result = Chunk.empty<B>()

      while (Chunk.size(todo) > 0) {
        const e = Chunk.unsafeHead(todo)
        todo = Chunk.unsafeTail(todo)

        if (e._tag === "Left") {
          todo = Chunk.concat_(todo, f(e.left))
        } else {
          result = Chunk.append_(result, e.right)
        }
      }

      return result
    }
})

export const breadthFirstChainRec = BreadthFirstChainRec.chainRec
