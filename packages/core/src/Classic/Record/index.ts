import * as E from "@effect-ts/system/Either"
import { flow, pipe, tuple } from "@effect-ts/system/Function"
import * as O from "@effect-ts/system/Option"
import * as R from "@effect-ts/system/Record"

import * as P from "../../Prelude"
import * as A from "../Array"

export const RecordURI = "Record"

export type RecordURI = typeof RecordURI

declare module "../../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [RecordURI]: R.Record<N, A>
  }
  interface URItoIndex<N extends string, K> {
    [RecordURI]: N
  }
}

export const Covariant = P.instance<P.Covariant<RecordURI>>({
  map: R.map
})

export const CovariantWithIndex = P.instance<P.CovariantWithIndex<RecordURI>>({
  mapWithIndex: R.mapWithIndex
})

export const foreachF = P.implementForeachF<RecordURI>()((_) => (G) => (f) =>
  foreachWithIndexF(G)((_, a) => f(a))
)

export const Traversable = P.instance<P.Traversable<RecordURI>>({
  map: R.map,
  foreachF
})

export const foreachWithIndexF = P.implementForeachWithIndexF<RecordURI>()(
  (_) => (G) => (f) =>
    flow(
      R.collect(tuple),
      A.foreachF(G)(([k, a]) => G.map((b) => tuple(k, b))(f(k, a))),
      G.map(
        A.reduce({} as R.Record<typeof _.N, typeof _.B>, (b, [k, v]) =>
          Object.assign(b, { [k]: v })
        )
      )
    )
)

export const TraversableWithIndex = P.instance<P.TraversableWithIndex<RecordURI>>({
  map: R.map,
  foreachWithIndexF
})

export const Reduce = P.instance<P.Reduce<RecordURI>>({
  reduce: R.reduce
})

export const ReduceRight = P.instance<P.ReduceRight<RecordURI>>({
  reduceRight: R.reduceRight
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<RecordURI>>({
  reduceWithIndex: R.reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<P.ReduceRightWithIndex<RecordURI>>({
  reduceRightWithIndex: R.reduceRightWithIndex
})

export const foldMap: P.FoldMapFn<RecordURI> = (I) => (f) =>
  foldMapWithIndex(I)((_, a) => f(a))

export const FoldMap = P.instance<P.FoldMap<RecordURI>>({
  foldMap
})

export const foldMapWithIndex: P.FoldMapWithIndexFn<RecordURI> = (I) => (f) =>
  R.reduceWithIndex(I.identity, (k, b, a) => I.combine(f(k, a))(b))

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<RecordURI>>({
  foldMapWithIndex
})

export const Foldable: P.Foldable<RecordURI> = {
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
}

export const FoldableWithIndex: P.FoldableWithIndex<RecordURI> = {
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
}

export const toRecord = <K extends string, V>(
  _: A.Array<readonly [K, V]>
): R.Record<K, V> =>
  A.reduce_(_, {} as R.Record<K, V>, (b, [k, v]) => Object.assign(b, { [k]: v }))

export const separateF = P.implementSeparateF<RecordURI>()(() => (G) => (f) =>
  separateWithIndexF(G)((_, a) => f(a))
)

export const Wiltable = P.instance<P.Wiltable<RecordURI>>({
  separateF
})

export const separateWithIndexF = P.implementSeparateWithIndexF<RecordURI>()(
  () => (G) => (f) =>
    flow(
      R.collect(tuple),
      A.separateF(G)(([k, a]) =>
        pipe(
          f(k, a),
          G.map(
            E.bimap(
              (b) => tuple(k, b),
              (a) => tuple(k, a)
            )
          )
        )
      ),
      G.map(({ left, right }) => ({ left: toRecord(left), right: toRecord(right) }))
    )
)

export const WiltableWithIndex = P.instance<P.WiltableWithIndex<RecordURI>>({
  separateWithIndexF
})

export const compactF = P.implementCompactF<RecordURI>()(() => (G) => (f) =>
  compactWithIndexF(G)((_, a) => f(a))
)

export const Witherable = P.instance<P.Witherable<RecordURI>>({
  compactF
})

export const compactWithIndexF = P.implementCompactWithIndexF<RecordURI>()(
  () => (G) => (f) =>
    flow(
      R.collect(tuple),
      A.compactF(G)(([k, a]) => pipe(f(k, a), G.map(O.map((b) => tuple(k, b))))),
      G.map(toRecord)
    )
)

export const WitherableWithIndex = P.instance<P.WitherableWithIndex<RecordURI>>({
  compactWithIndexF
})

export const Compact = P.instance<P.Compact<RecordURI>>({
  compact: R.compact
})

export const Separate = P.instance<P.Separate<RecordURI>>({
  separate: R.separate
})

export const Compactable: P.Compactable<RecordURI> = {
  ...Separate,
  ...Compact
}

export {
  collect,
  collect_,
  compact,
  deleteAt,
  deleteAt_,
  empty,
  every,
  every_,
  filter,
  filterMap,
  filterMapWithIndex,
  filterMapWithIndex_,
  filterMap_,
  filterWithIndex,
  filterWithIndex_,
  filter_,
  fromMutable,
  hasOwnProperty,
  insertAt,
  insertAt_,
  isEmpty,
  keys,
  lookup,
  lookup_,
  map,
  mapWithIndex,
  mapWithIndex_,
  map_,
  modifyAt,
  modifyAt_,
  partition,
  partitionMap,
  partitionMapWithIndex,
  partitionMapWithIndex_,
  partitionMap_,
  partitionWithIndex,
  partitionWithIndex_,
  partition_,
  pop,
  pop_,
  Record,
  reduce,
  reduceRight,
  reduceRightWithIndex,
  reduceRightWithIndex_,
  reduceRight_,
  reduceWithIndex,
  reduceWithIndex_,
  reduce_,
  separate,
  singleton,
  size,
  some,
  some_,
  toMutable,
  toReadonlyArray,
  updateAt,
  updateAt_
} from "@effect-ts/system/Record"
