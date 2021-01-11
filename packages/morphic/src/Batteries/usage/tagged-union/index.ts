import {
  difference,
  Foldable as foldableArray,
  intersection
} from "@effect-ts/core/Common/Array"
import { first } from "@effect-ts/core/Common/Associative"
import { eqString } from "@effect-ts/core/Common/Equal"
import {
  fromFoldable as RfromFoldable,
  mapWithIndex as RmapWithIndex
} from "@effect-ts/core/Common/Record"
import { tuple } from "@effect-ts/core/Function"

import type { ADT } from "../../../Adt"
import { makeADT } from "../../../Adt"
import type { ElemType } from "../../../Adt/utils"
import type { TaggedUnionConfig, TaggedUnionURI } from "../../../Algebra/TaggedUnion"
import type { ConfigsForType, HKT, InterpreterURIS, URItoAlgebra } from "../../../HKT"
import type { InterpreterURI } from "../interpreter-result"
import type { Materialized, Morph } from "../materializer"
import type { ProgramType, ProgramURI } from "../program-type"
import type { AType, EType, InhabitedTypes } from "../utils"
import { assignCallable, wrapFun } from "../utils"

export type IfStringLiteral<T, IfLiteral, IfString, IfNotString> = T extends string
  ? string extends T
    ? IfString
    : IfLiteral
  : IfNotString

export type TaggedUnionProg<R, E, A, ProgURI extends ProgramURI> = ProgramType<
  R,
  E,
  A
>[ProgURI] &
  (<G extends InterpreterURIS>(a: URItoAlgebra<G, R>[TaggedUnionURI]) => HKT<R, E, A>)

export type M<
  R,
  E,
  A,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI
> = Materialized<R, E, A, ProgURI, InterpURI>

export type AnyTypes = Record<string, InhabitedTypes<any, any, any>>

export type UnionTypes<
  Types extends AnyTypes,
  Tag extends keyof any,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  R
> = {
  [k in keyof Types]: M<
    R,
    EType<Types[k]>,
    AType<Types[k]> & { [t in Tag]: k },
    ProgURI,
    InterpURI
  >
}

export type AnyM<ProgURI extends ProgramURI, InterpURI extends InterpreterURI, R> = M<
  R,
  any,
  any,
  ProgURI,
  InterpURI
>

const recordFromArray = RfromFoldable(first<any>(), foldableArray)
const keepKeys = (a: Record<string, any>, toKeep: Array<string>): object =>
  recordFromArray(
    intersection(eqString)(toKeep)(Object.keys(a)).map((k: string) => tuple(k, a[k]))
  )

const excludeKeys = (a: Record<string, any>, toExclude: Array<string>): object =>
  recordFromArray(
    difference(eqString)(toExclude)(Object.keys(a)).map((k: string) => tuple(k, a[k]))
  )

export type TaggedBuilder<
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  R
> = <Tag extends string>(
  tag: Tag
) => <Types extends UnionTypes<Types, Tag, ProgURI, InterpURI, R>>(
  o: Types,
  config?: {
    name?: string
    conf?: ConfigsForType<
      R,
      Types[keyof Types]["_E"],
      Types[keyof Types]["_A"],
      TaggedUnionConfig<Types>
    >
  }
) => MorphADT<
  {
    [k in keyof Types]: Types[k] extends InhabitedTypes<any, infer E, infer A>
      ? [E, A]
      : never
  },
  Tag,
  ProgURI,
  InterpURI,
  R
>

export function makeTagged<
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  R
>(
  summ: <E, A>(F: TaggedUnionProg<R, E, A, ProgURI>) => M<R, E, A, ProgURI, InterpURI>
): TaggedBuilder<ProgURI, InterpURI, R>

export function makeTagged<
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  R
>(
  summ: <E, A>(F: TaggedUnionProg<R, E, A, ProgURI>) => M<R, E, A, ProgURI, InterpURI>
): <Tag extends string>(
  tag: Tag
) => <Types extends UnionTypes<Types, Tag, ProgURI, InterpURI, R>>(
  o: Types,
  config?: {
    name?: string
    conf?: ConfigsForType<
      Parameters<Types[keyof Types]["_R"]>[0],
      Types[keyof Types]["_E"],
      Types[keyof Types]["_A"],
      TaggedUnionConfig<Types>
    >
  }
) => MorphADT<
  {
    [k in keyof Types]: Types[k] extends InhabitedTypes<any, infer E, infer A>
      ? [E, A]
      : never
  },
  Tag,
  ProgURI,
  InterpURI,
  R
> {
  return (tag) => (o, config) => {
    const summoned = summ((F: any) =>
      F.taggedUnion(
        tag,
        RmapWithIndex((_k, v: AnyM<ProgURI, InterpURI, R>) => (v as any)(F))(o),
        config
      )
    ) as any

    const adt = makeADT(tag)(o as any)

    const preTagged = makeTagged(summ)(tag)

    const selectMorph = (selectedKeys: string[], c?: { name?: string; conf?: any }) =>
      preTagged(keepKeys(o, selectedKeys as string[]), {
        name: c?.name || config?.name,
        conf: { ...config?.conf, ...c?.conf }
      })
    const excludeMorph = (selectedKeys: string[], c?: { name?: string; conf?: any }) =>
      preTagged(excludeKeys(o, selectedKeys as string[]), {
        name: c?.name || config?.name,
        conf: { ...config?.conf, ...c?.conf }
      })

    const res = assignCallable(wrapFun(summoned as any), {
      ...summoned,
      ...adt,
      selectMorph,
      excludeMorph
    })

    return res
  }
}

export type AnyADTTypes = {
  [k in keyof AnyTypes]: [any, any]
}

export type EOfTypes<Types extends AnyADTTypes> = Types[keyof Types][0]

export type AOfTypes<Types extends AnyADTTypes> = Types[keyof Types][1]

export type AOfMorhpADT<T extends HasTypes<any>> = AOfTypes<T["_Types"]>

export type EOfMorhpADT<T extends HasTypes<any>> = EOfTypes<T["_Types"]>

export type MorphADT<
  Types extends AnyADTTypes,
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  R
> = HasTypes<Types> &
  ADT<AOfTypes<Types>, Tag> &
  Morph<R, EOfTypes<Types>, AOfTypes<Types>, InterpURI, ProgURI> &
  Refinable<Types, Tag, ProgURI, InterpURI, R>

export interface HasTypes<Types extends AnyADTTypes> {
  _Types: Types
}

export interface Refinable<
  Types extends AnyADTTypes,
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  R
> {
  selectMorph: <Keys extends (keyof Types)[]>(
    keys: Keys,
    config?: {
      name?: string
      conf?: ConfigsForType<
        R,
        {
          [k in Extract<keyof Types, ElemType<Keys>>]: Types[k][0]
        }[Extract<keyof Types, ElemType<Keys>>],
        {
          [k in Extract<keyof Types, ElemType<Keys>>]: Types[k][1]
        }[Extract<keyof Types, ElemType<Keys>>],
        TaggedUnionConfig<
          {
            [k in Extract<keyof Types, ElemType<Keys>>]: Types[k]
          }
        >
      >
    }
  ) => MorphADT<
    {
      [k in Extract<keyof Types, ElemType<Keys>>]: Types[k]
    },
    Tag,
    ProgURI,
    InterpURI,
    R
  >
  excludeMorph: <Keys extends (keyof Types)[]>(
    keys: Keys,
    config?: {
      name?: string
      conf?: ConfigsForType<
        R,
        {
          [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k][0]
        }[Exclude<keyof Types, ElemType<Keys>>],
        {
          [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k][1]
        }[Exclude<keyof Types, ElemType<Keys>>],
        TaggedUnionConfig<
          {
            [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k]
          }
        >
      >
    }
  ) => MorphADT<
    {
      [k in Exclude<keyof Types, ElemType<Keys>>]: Types[k]
    },
    Tag,
    ProgURI,
    InterpURI,
    R
  >
}
