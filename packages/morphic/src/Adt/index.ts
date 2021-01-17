import type { Array } from "@effect-ts/core/Array"
import {
  difference,
  Foldable as foldableArray,
  intersection,
  reduceRight
} from "@effect-ts/core/Array"
import { first as AssociativeFirst } from "@effect-ts/core/Associative"
import { eqString } from "@effect-ts/core/Equal"
import { tuple } from "@effect-ts/core/Function"
import { fromFoldable } from "@effect-ts/core/Record"

import * as CU from "./ctors"
import * as Ma from "./matcher"
import * as M from "./monocle"
import * as PU from "./predicates"
import type {
  ElemType,
  ExcludeUnion,
  ExtractUnion,
  KeysDefinition,
  Tagged
} from "./utils"

export interface ADT<A, Tag extends keyof A & string>
  extends Ma.Matchers<A, Tag>,
    PU.Predicates<A, Tag>,
    CtorsWithKeys<A, Tag>,
    M.MonocleFor<A> {
  select: <Keys extends A[Tag][]>(
    keys: Keys
  ) => ADT<ExtractUnion<A, Tag, ElemType<Keys>>, Tag>
  exclude: <Keys extends A[Tag][]>(
    keys: Keys
  ) => ADT<ExcludeUnion<A, Tag, ElemType<Keys>>, Tag>
}

interface CtorsWithKeys<A, Tag extends keyof A & string> extends CU.Ctors<A, Tag> {
  keys: KeysDefinition<A, Tag>
}

export type ADTType<A extends ADT<any, any>> = CU.CtorType<A>

const mergeKeys = <A extends Tagged<Tag>, B extends Tagged<Tag>, Tag extends string>(
  a: KeysDefinition<A, Tag>,
  b: KeysDefinition<B, Tag>
): KeysDefinition<A | B, Tag> => ({ ...a, ...b } as any)

const recordFromArray = fromFoldable(AssociativeFirst<any>(), foldableArray)
const toTupleNull = (k: string) => tuple(k, null)

const intersectKeys = <
  A extends Tagged<Tag>,
  B extends Tagged<Tag>,
  Tag extends string
>(
  a: KeysDefinition<A, Tag>,
  b: KeysDefinition<B, Tag>
): KeysDefinition<Extract<A, B>, Tag> =>
  recordFromArray(
    intersection(eqString)(Object.keys(b))(Object.keys(a)).map(toTupleNull)
  ) as KeysDefinition<Extract<A, B>, Tag>

const excludeKeys = <A extends Tagged<Tag>, Tag extends string>(
  a: KeysDefinition<A, Tag>,
  toRemove: Array<string>
): object =>
  recordFromArray(difference(eqString)(toRemove)(Object.keys(a)).map(toTupleNull))

const keepKeys = <A extends Tagged<Tag>, Tag extends string>(
  a: KeysDefinition<A, Tag>,
  toKeep: Array<string>
): object =>
  recordFromArray(intersection(eqString)(toKeep)(Object.keys(a)).map(toTupleNull))

export const unionADT = <
  AS extends [
    CtorsWithKeys<any, any>,
    CtorsWithKeys<any, any>,
    ...Array<CtorsWithKeys<any, any>>
  ]
>(
  as: AS
): ADT<CU.CtorType<AS[number]>, AS[number]["tag"]> => {
  const newKeys = reduceRight(as[0].keys, (x: AS[number], y) => mergeKeys(x.keys, y))(
    as
  )
  return makeADT(as[0].tag)(newKeys)
}

export const intersectADT = <
  A extends Tagged<Tag>,
  B extends Tagged<Tag>,
  Tag extends string
>(
  a: ADT<A, Tag>,
  b: ADT<B, Tag>
): ADT<Extract<A, B>, Tag> => makeADT(a.tag)(intersectKeys(a.keys, b.keys))

interface TypeDef<T> {
  _TD: T
}

type TypeOfDef<X extends TypeDef<any>> = X["_TD"]

export const ofType = <T>(): TypeDef<T> => 1 as any

export const makeADT = <Tag extends string>(tag: Tag) => <
  R extends { [x in keyof R]: TypeDef<{ [t in Tag]: x }> }
>(
  _keys: R
): ADT<TypeOfDef<R[keyof R]>, Tag> => {
  type Tag = typeof tag
  type A = TypeOfDef<R[keyof R]>
  type B = A & Tagged<Tag>
  const keys = _keys as KeysDefinition<Tagged<Tag>, Tag> // any

  const ctors = CU.Ctors(tag)(keys)
  const predicates = PU.Predicates<A, Tag>(tag)(keys)
  const monocles = M.MonocleFor<A>()
  const matchers = Ma.Matchers<B, Tag>(tag)(keys)

  const select = <Keys extends A[Tag][]>(
    selectedKeys: Keys
  ): ADT<ExtractUnion<A, Tag, ElemType<Keys>>, Tag> =>
    makeADT(tag)(keepKeys(keys, selectedKeys as string[]) as any)

  const exclude = <Keys extends B[Tag][]>(
    excludedKeys: Keys
  ): ADT<ExcludeUnion<B, Tag, ElemType<Keys>>, Tag> =>
    makeADT(tag)(excludeKeys(keys, excludedKeys) as any)

  const res: ADT<B, Tag> = {
    ...ctors,
    ...predicates,
    ...monocles,
    ...matchers,
    tag,
    keys,
    select,
    exclude
  }

  return res as ADT<A, Tag>
}
