// ets_tracing: off

import type { Either } from "../../../Either/index.js"
import * as O from "../../../Option/index.js"
import * as DSL from "../../../PreludeV2/DSL/index.js"
import * as P from "../../../PreludeV2/index.js"
import type { PredicateWithIndex } from "../../../Utils/index.js"
import * as Chunk from "./operations.js"

export interface ChunkF extends P.HKT {
  readonly type: Chunk.Chunk<this["A"]>
}
export const Collection = P.instance<P.Collection<ChunkF>>({
  builder: Chunk.builder
})

export const Any = P.instance<P.Any<ChunkF>>({
  any: () => Chunk.single({})
})

export const AssociativeBothZip = P.instance<P.AssociativeBoth<ChunkF>>({
  both: Chunk.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<ChunkF>>({
  flatten: Chunk.flatten
})

export const Covariant = P.instance<P.Covariant<ChunkF>>({
  map: Chunk.map
})

export const ApplyZip = P.instance<P.Apply<ChunkF>>({
  ...Covariant,
  ...AssociativeBothZip
})

export const Monad = P.instance<P.Monad<ChunkF>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})
export const Applicative = DSL.getApplicativeF(Monad)

export const ForEach = P.instance<P.ForEach<ChunkF>>({
  map: Chunk.map,
  forEachF: Chunk.forEachF
})

export const ForEachWithIndex = P.instance<P.ForEachWithIndex<number, ChunkF>>({
  map: Chunk.map,
  forEachWithIndexF: Chunk.forEachWithIndexF
})

export const Wiltable = P.instance<P.Wiltable<ChunkF>>({
  separateF: Chunk.separateF
})

export const WiltableWithIndex = P.instance<P.WiltableWithIndex<number, ChunkF>>({
  separateWithIndexF: Chunk.separateWithIndexF
})

export const Witherable = P.instance<P.Witherable<ChunkF>>({
  compactF: Chunk.compactF
})

export const WitherableWithIndex = P.instance<P.WitherableWithIndex<number, ChunkF>>({
  compactWithIndexF: Chunk.compactWithIndexF
})

export const Compact = P.instance<P.Compact<ChunkF>>({
  compact: Chunk.compact
})

export const Separate = P.instance<P.Separate<ChunkF>>({
  separate: Chunk.separate
})

export const Extend = P.instance<P.Extend<ChunkF>>({
  extend: (f) => (fa) => Chunk.single(f(fa))
})

export const Reduce = P.instance<P.Reduce<ChunkF>>({
  reduce: Chunk.reduce
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<number, ChunkF>>({
  reduceWithIndex: (b, f) => (fa) =>
    Chunk.reduce_(Chunk.zipWithIndex(fa), b, (b, { tuple: [a, i] }) => f(i, b, a))
})

export const ReduceRightWithIndex = P.instance<P.ReduceRightWithIndex<number, ChunkF>>({
  reduceRightWithIndex: (b, f) => (fa) =>
    Chunk.reduceRight_(Chunk.zipWithIndex(fa), b, ({ tuple: [a, i] }, b) => f(i, a, b))
})

export const ReduceRight = P.instance<P.ReduceRight<ChunkF>>({
  reduceRight: Chunk.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<ChunkF>>({
  foldMap: Chunk.foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<number, ChunkF>>({
  foldMapWithIndex: Chunk.foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<ChunkF>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const FoldableWithIndex = P.instance<P.FoldableWithIndex<number, ChunkF>>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})

export const Filter = P.instance<P.Filter<ChunkF>>({
  filter: Chunk.filter
})

export const FilterWithIndex = P.instance<P.FilterWithIndex<number, ChunkF>>({
  filterWithIndex:
    <A>(predicate: PredicateWithIndex<number, A>) =>
    (fa: Chunk.Chunk<A>): Chunk.Chunk<A> =>
      Chunk.collect_(Chunk.zipWithIndex(fa), ({ tuple: [a, i] }) =>
        predicate(i, a) ? O.some(a) : O.none
      )
})

export const FilterMap = P.instance<P.FilterMap<ChunkF>>({
  filterMap: Chunk.collect
})

export const FilterMapWithIndex = P.instance<P.FilterMapWithIndex<number, ChunkF>>({
  filterMapWithIndex: (f) => (fa) =>
    Chunk.collect_(Chunk.zipWithIndex(fa), ({ tuple: [a, i] }) => f(i, a))
})

export const Partition = P.instance<P.Partition<ChunkF>>({
  partition: Chunk.partition
})

export const PartitionWithIndex = P.instance<P.PartitionWithIndex<number, ChunkF>>({
  partitionWithIndex: Chunk.partitionWithIndex
})

export const PartitionMap = P.instance<P.PartitionMap<ChunkF>>({
  partitionMap: Chunk.partitionMap
})

export const PartitionMapWithIndex = P.instance<
  P.PartitionMapWithIndex<number, ChunkF>
>({
  partitionMapWithIndex: Chunk.partitionMapWithIndex
})

export const Filterable = P.instance<P.Filterable<ChunkF>>({
  ...Filter,
  ...FilterMap,
  ...Partition,
  ...PartitionMap
})

export const FilterableWithIndex = P.instance<P.FilterableWithIndex<number, ChunkF>>({
  ...FilterWithIndex,
  ...FilterMapWithIndex,
  ...PartitionWithIndex,
  ...PartitionMapWithIndex
})

/**
 * Exposing depth first recursion
 */
export const DepthFirstChainRec = P.instance<P.ChainRec<ChunkF>>({
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
export const BreadthFirstChainRec = P.instance<P.ChainRec<ChunkF>>({
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
