// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"

import * as DSL from "../../../Prelude/DSL/index.js"
import * as P from "../../../Prelude/index.js"
import * as A from "./operations.js"

export interface ArrayF extends P.HKT {
  readonly type: A.Array<this["A"]>
}

export const Any = P.instance<P.Any<ArrayF>>({
  any: () => [{}]
})

export const AssociativeBothZip = P.instance<P.AssociativeBoth<ArrayF>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<ArrayF>>({
  flatten: A.flatten
})

export const Covariant = P.instance<P.Covariant<ArrayF>>({
  map: A.map
})

export const ApplyZip = P.instance<P.Apply<ArrayF>>({
  ...Covariant,
  ...AssociativeBothZip
})

export const Monad = P.instance<P.Monad<ArrayF>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const Applicative = DSL.getApplicativeF(Monad)

export const ForEach = P.instance<P.ForEach<ArrayF>>({
  map: A.map,
  forEachF: A.forEachF
})

export const ForEachWithIndex = P.instance<P.ForEachWithIndex<number, ArrayF>>({
  map: A.map,
  forEachWithIndexF: A.forEachWithIndexF
})

export const Wiltable = P.instance<P.Wiltable<ArrayF>>({
  separateF: A.separateF
})

export const WiltableWithIndex = P.instance<P.WiltableWithIndex<number, ArrayF>>({
  separateWithIndexF: A.separateWithIndexF
})

export const Witherable = P.instance<P.Witherable<ArrayF>>({
  compactF: A.compactF
})

export const WitherableWithIndex = P.instance<P.WitherableWithIndex<number, ArrayF>>({
  compactWithIndexF: A.compactWithIndexF
})

export const Compact = P.instance<P.Compact<ArrayF>>({
  compact: A.compact
})

export const Separate = P.instance<P.Separate<ArrayF>>({
  separate: A.separate
})

export const Extend = P.instance<P.Extend<ArrayF>>({
  extend: A.extend
})

export const Reduce = P.instance<P.Reduce<ArrayF>>({
  reduce: A.reduce
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<number, ArrayF>>({
  reduceWithIndex: A.reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<P.ReduceRightWithIndex<number, ArrayF>>({
  reduceRightWithIndex: A.reduceRightWithIndex
})

export const ReduceRight = P.instance<P.ReduceRight<ArrayF>>({
  reduceRight: A.reduceRight
})

export const FoldMap = P.instance<P.FoldMap<ArrayF>>({
  foldMap: A.foldMap
})

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<number, ArrayF>>({
  foldMapWithIndex: A.foldMapWithIndex
})

export const Foldable = P.instance<P.Foldable<ArrayF>>({
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
})

export const FoldableWithIndex = P.instance<P.FoldableWithIndex<number, ArrayF>>({
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
})

export const Filter = P.instance<P.Filter<ArrayF>>({
  filter: A.filter
})

export const FilterWithIndex = P.instance<P.FilterWithIndex<number, ArrayF>>({
  filterWithIndex: A.filterWithIndex
})

export const FilterMap = P.instance<P.FilterMap<ArrayF>>({
  filterMap: A.collect
})

export const FilterMapWithIndex = P.instance<P.FilterMapWithIndex<number, ArrayF>>({
  filterMapWithIndex: A.collectWithIndex
})

export const Partition = P.instance<P.Partition<ArrayF>>({
  partition: A.partition
})

export const PartitionWithIndex = P.instance<P.PartitionWithIndex<number, ArrayF>>({
  partitionWithIndex: A.partitionWithIndex
})

export const PartitionMap = P.instance<P.PartitionMap<ArrayF>>({
  partitionMap: A.partitionMap
})

export const PartitionMapWithIndex = P.instance<
  P.PartitionMapWithIndex<number, ArrayF>
>({
  partitionMapWithIndex: A.partitionMapWithIndex
})

export const Filterable = P.instance<P.Filterable<ArrayF>>({
  ...Filter,
  ...FilterMap,
  ...Partition,
  ...PartitionMap
})

export const FilterableWithIndex = P.instance<P.FilterableWithIndex<number, ArrayF>>({
  ...FilterWithIndex,
  ...FilterMapWithIndex,
  ...PartitionWithIndex,
  ...PartitionMapWithIndex
})

export const depthFirstChainRec: P.ChainRec<ArrayF>["chainRec"] = <A, B>(
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
export const DepthFirstChainRec = P.instance<P.ChainRec<ArrayF>>({
  chainRec: depthFirstChainRec
})

/**
 * Exposing breadth first recursion
 */
export const BreadthFirstChainRec = P.instance<P.ChainRec<ArrayF>>({
  chainRec: breadthFirstChainRec
})
