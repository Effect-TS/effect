import * as O from "@effect-ts/system/Option"
import * as R from "@effect-ts/system/Record"

import { flow, pipe, tuple } from "../../Function"
import type { RecordURI } from "../../Modules"
import * as P from "../../Prelude"
import * as A from "../Array"
import * as E from "../Either"
import type { V } from "./definition"

export * from "@effect-ts/system/Record"

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

export const foreachF = P.implementForeachF<[RecordURI], V>()((_) => (G) => (f) =>
  foreachWithIndexF(G)((_, a) => f(a))
)

export const foldMapWithIndex: P.FoldMapWithIndexFn<[RecordURI], V> = (I) => (f) =>
  R.reduceWithIndex(I.identity, (k, b, a) => I.combine(f(k, a))(b))

export const foldMap: P.FoldMapFn<[RecordURI], V> = (I) => (f) =>
  foldMapWithIndex(I)((_, a) => f(a))

export const toRecord = <K extends string, V>(
  _: A.Array<readonly [K, V]>
): R.Record<K, V> =>
  A.reduce_(_, {} as R.Record<K, V>, (b, [k, v]) => Object.assign(b, { [k]: v }))

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
      G.map(({ left, right }) => ({
        left: toRecord(left),
        right: toRecord(right)
      }))
    )
)

export const separateF = P.implementSeparateF<[RecordURI], V>()(() => (G) => (f) =>
  separateWithIndexF(G)((_, a) => f(a))
)

export const compactWithIndexF = P.implementCompactWithIndexF<[RecordURI], V>()(
  () => (G) => (f) =>
    flow(
      R.collect(tuple),
      A.compactF(G)(([k, a]) => pipe(f(k, a), G.map(O.map((b) => tuple(k, b))))),
      G.map(toRecord)
    )
)

export const compactF = P.implementCompactF<[RecordURI], V>()(() => (G) => (f) =>
  compactWithIndexF(G)((_, a) => f(a))
)
