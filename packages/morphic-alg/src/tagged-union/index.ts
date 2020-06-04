import type { URIS, Kind, URIS2, Kind2, HKT2 } from "@morphic-ts/common/lib/HKT"
import type { ConfigsForType, AnyEnv } from "@morphic-ts/common/lib/config"

export const TaggedUnionsURI = "@matechs/core/TaggedUnionsURI" as const

export type TaggedUnionsURI = typeof TaggedUnionsURI

declare module "@morphic-ts/algebras/lib/hkt" {
  export interface Algebra<F, Env> {
    [TaggedUnionsURI]: MatechsAlgebraTaggedUnions<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [TaggedUnionsURI]: MatechsAlgebraTaggedUnions1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [TaggedUnionsURI]: MatechsAlgebraTaggedUnions2<F, Env>
  }
}

export type TaggedValues<Tag extends string, O> = {
  [o in keyof O]: O[o] & { [t in Tag]: o }
}

export type TaggedTypes<F, Tag extends string, L, A, R> = {
  [o in keyof A & keyof L]: HKT2<F, R, L[o], (A & { [x in o]: { [k in Tag]: o } })[o]>
}

type DecorateTag<
  X extends HKT2<any, any, any, any>,
  Tag extends string,
  VTag
> = X extends HKT2<infer F, infer R, infer L, infer A>
  ? HKT2<F, R, L, A & { [k in Tag]: VTag }>
  : never

export interface MatechsAlgebraTaggedUnions<F, Env> {
  _F: F
  taggedUnion: {
    <Tag extends string, Types extends TaggedTypes<F, Tag, any, any, Env>>(
      tag: Tag,
      types: Types & { [o in keyof Types]: DecorateTag<Types[o], Tag, o> },
      name: string,
      config?: ConfigsForType<Env, Types[keyof Types]["_E"], Types[keyof Types]["_A"]>
    ): HKT2<F, Env, Types[keyof Types]["_E"], Types[keyof Types]["_A"]>
  }
}

export type TaggedTypes1<F extends URIS, Tag extends string, O, R> = {
  [o in keyof O]: Kind<F, R, O[o] & { [t in Tag]: o }>
}

export interface MatechsAlgebraTaggedUnions1<F extends URIS, Env extends AnyEnv> {
  _F: F
  taggedUnion<Tag extends string, O>(
    tag: Tag,
    types: TaggedTypes1<F, Tag, O, Env>,
    name: string,
    config?: ConfigsForType<Env, unknown, TaggedValues<Tag, O>[keyof O]>
  ): Kind<F, Env, TaggedValues<Tag, O>[keyof O]>
}

export type TaggedTypes2<F extends URIS2, Tag extends string, L, A, R> = {
  [o in keyof A & keyof L]: Kind2<
    F,
    R,
    A[o] & { [t in Tag]: o },
    L[o] & { [t in Tag]: o }
  >
}

export interface MatechsAlgebraTaggedUnions2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  taggedUnion<Tag extends string, A, L>(
    tag: Tag,
    types: TaggedTypes2<F, Tag, A, L, Env>,
    name: string,
    config?: ConfigsForType<
      Env,
      TaggedValues<Tag, L>[keyof L],
      TaggedValues<Tag, A>[keyof A]
    >
  ): Kind2<F, Env, TaggedValues<Tag, L>[keyof L], TaggedValues<Tag, A>[keyof A]>
}
