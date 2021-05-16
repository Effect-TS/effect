// tracing: off

import type { Either } from "../../../Either"
import type { ArrayURI, ChunkURI } from "../../../Modules"
import * as O from "../../../Option"
import type { URI } from "../../../Prelude"
import { getApplicativeF } from "../../../Prelude"
import * as P from "../../../Prelude"
import type { PredicateWithIndex } from "../../../Utils"
import * as Chunk from "./operations"

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

export const Wiltable = P.instance<P.Wiltable<[URI<ArrayURI>]>>({
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
      Chunk.filterMap_(Chunk.zipWithIndex(fa), ({ tuple: [a, i] }) =>
        predicate(i, a) ? O.some(a) : O.none
      )
})

export const FilterMap = P.instance<P.FilterMap<[URI<ChunkURI>]>>({
  filterMap: Chunk.filterMap
})

export const FilterMapWithIndex = P.instance<P.FilterMapWithIndex<[URI<ChunkURI>]>>({
  filterMapWithIndex: (f) => (fa) =>
    Chunk.filterMap_(Chunk.zipWithIndex(fa), ({ tuple: [a, i] }) => f(i, a))
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

export const depthFirstChainRec: P.ChainRec<[URI<ArrayURI>]>["chainRec"] = <A, B>(
  f: (a: A) => ReadonlyArray<Either<A, B>>
): ((a: A) => ReadonlyArray<B>) => {
  return (a) => {
    // tslint:disable-next-line: readonly-array
    const todo: Array<Either<A, B>> = [...f(a)]
    // tslint:disable-next-line: readonly-array
    const result: Array<B> = []

    while (todo.length > 0) {
      const e = todo.shift()!
      if (e._tag === "Left") {
        todo.unshift(...f(e.left))
      } else {
        result.push(e.right)
      }
    }

    return result
  }
}

export function breadthFirstChainRec<A, B>(
  f: (a: A) => ReadonlyArray<Either<A, B>>
): (a: A) => ReadonlyArray<B> {
  return (a) => {
    const initial = f(a)
    // tslint:disable-next-line: readonly-array
    const todo: Array<Either<A, B>> = []
    // tslint:disable-next-line: readonly-array
    const result: Array<B> = []

    function go(e: Either<A, B>): void {
      if (e._tag === "Left") {
        f(e.left).forEach((v) => todo.push(v))
      } else {
        result.push(e.right)
      }
    }

    for (const e of initial) {
      go(e)
    }

    while (todo.length > 0) {
      go(todo.shift()!)
    }

    return result
  }
}

/**
 * Exposing depth first recursion
 */
export const DepthFirstChainRec = P.instance<P.ChainRec<[URI<ArrayURI>]>>({
  chainRec: depthFirstChainRec
})

/**
 * Exposing breadth first recursion
 */
export const BreadthFirstChainRec = P.instance<P.ChainRec<[URI<ArrayURI>]>>({
  chainRec: breadthFirstChainRec
})
