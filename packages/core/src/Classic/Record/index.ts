import * as E from "@effect-ts/system/Either"
import { flow, pipe, tuple } from "@effect-ts/system/Function"
import * as O from "@effect-ts/system/Option"
import * as R from "@effect-ts/system/Record"

import type { RecordURI } from "../../Modules"
import * as P from "../../Prelude"
import * as A from "../Array"

export { RecordURI } from "../../Modules"

export type V = P.V<"N", "_">

export const Covariant = P.instance<P.Covariant<[RecordURI], V>>({
  map: R.map
})

export const CovariantWithIndex = P.instance<P.CovariantWithIndex<[RecordURI], V>>({
  mapWithIndex: R.mapWithIndex
})

export const foreachF = P.implementForeachF<[RecordURI], V>()((_) => (G) => (f) =>
  foreachWithIndexF(G)((_, a) => f(a))
)

export const Traversable = P.instance<P.Traversable<[RecordURI], V>>({
  map: R.map,
  foreachF
})

export const foreachWithIndexF = P.implementForeachWithIndexF<[RecordURI], V>()(
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

export const TraversableWithIndex = P.instance<P.TraversableWithIndex<[RecordURI], V>>({
  map: R.map,
  foreachWithIndexF
})

export const Reduce = P.instance<P.Reduce<[RecordURI], V>>({
  reduce: R.reduce
})

export const ReduceRight = P.instance<P.ReduceRight<[RecordURI], V>>({
  reduceRight: R.reduceRight
})

export const ReduceWithIndex = P.instance<P.ReduceWithIndex<[RecordURI], V>>({
  reduceWithIndex: R.reduceWithIndex
})

export const ReduceRightWithIndex = P.instance<P.ReduceRightWithIndex<[RecordURI], V>>({
  reduceRightWithIndex: R.reduceRightWithIndex
})

export const foldMap: P.FoldMapFn<[RecordURI], V> = (I) => (f) =>
  foldMapWithIndex(I)((_, a) => f(a))

export const FoldMap = P.instance<P.FoldMap<[RecordURI], V>>({
  foldMap
})

export const foldMapWithIndex: P.FoldMapWithIndexFn<[RecordURI], V> = (I) => (f) =>
  R.reduceWithIndex(I.identity, (k, b, a) => I.combine(f(k, a))(b))

export const FoldMapWithIndex = P.instance<P.FoldMapWithIndex<[RecordURI], V>>({
  foldMapWithIndex
})

export const Foldable: P.Foldable<[RecordURI], V> = {
  ...FoldMap,
  ...Reduce,
  ...ReduceRight
}

export const FoldableWithIndex: P.FoldableWithIndex<[RecordURI], V> = {
  ...FoldMapWithIndex,
  ...ReduceWithIndex,
  ...ReduceRightWithIndex
}

export const toRecord = <K extends string, V>(
  _: A.Array<readonly [K, V]>
): R.Record<K, V> =>
  A.reduce_(_, {} as R.Record<K, V>, (b, [k, v]) => Object.assign(b, { [k]: v }))

export const separateF = P.implementSeparateF<[RecordURI], V>()(() => (G) => (f) =>
  separateWithIndexF(G)((_, a) => f(a))
)

export const Wiltable = P.instance<P.Wiltable<[RecordURI], V>>({
  separateF
})

export const separateWithIndexF = P.implementSeparateWithIndexF<[RecordURI], V>()(
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

export const WiltableWithIndex = P.instance<P.WiltableWithIndex<[RecordURI], V>>({
  separateWithIndexF
})

export const compactF = P.implementCompactF<[RecordURI], V>()(() => (G) => (f) =>
  compactWithIndexF(G)((_, a) => f(a))
)

export const Witherable = P.instance<P.Witherable<[RecordURI], V>>({
  compactF
})

export const compactWithIndexF = P.implementCompactWithIndexF<[RecordURI], V>()(
  () => (G) => (f) =>
    flow(
      R.collect(tuple),
      A.compactF(G)(([k, a]) => pipe(f(k, a), G.map(O.map((b) => tuple(k, b))))),
      G.map(toRecord)
    )
)

export const WitherableWithIndex = P.instance<P.WitherableWithIndex<[RecordURI], V>>({
  compactWithIndexF
})

export const Compact = P.instance<P.Compact<[RecordURI], V>>({
  compact: R.compact
})

export const Separate = P.instance<P.Separate<[RecordURI], V>>({
  separate: R.separate
})

export const Compactable: P.Compactable<[RecordURI], V> = {
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
