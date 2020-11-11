import type { AnyEnv, ConfigsForType, InterpreterURIS, Kind, Named } from "../../HKT"

export const TaggedUnionURI = "TaggedUnionURI" as const
export type TaggedUnionURI = typeof TaggedUnionURI

export type TaggedValues<Tag extends string, O> = {
  [o in keyof O]: O[o] & { [t in Tag]: o }
}

export interface TaggedUnionConfig<Types> {}

export type TaggedTypes<F extends InterpreterURIS, Tag extends string, L, A, R> = {
  [o in keyof A & keyof L]: Kind<
    F,
    R,
    A[o] & { [t in Tag]: o },
    L[o] & { [t in Tag]: o }
  >
}

export interface AlgebraTaggedUnion<F extends InterpreterURIS, Env extends AnyEnv> {
  _F: F
  taggedUnion<
    Tag extends string,
    Types extends {
      [k in keyof Types]: Kind<F, Env, { [t in Tag]: string }, { [t in Tag]: string }>
    }
  >(
    tag: Tag,
    types: Types,
    config?: Named<
      ConfigsForType<
        Env,
        {
          [k in keyof Types]: [Types[k]] extends [Kind<F, Env, infer E, infer A>]
            ? E
            : never
        }[keyof Types],
        {
          [k in keyof Types]: [Types[k]] extends [Kind<F, Env, infer E, infer A>]
            ? A
            : never
        }[keyof Types],
        TaggedUnionConfig<Types>
      >
    >
  ): Kind<
    F,
    Env,
    {
      [k in keyof Types]: [Types[k]] extends [Kind<F, Env, infer E, infer A>]
        ? E
        : never
    }[keyof Types],
    {
      [k in keyof Types]: [Types[k]] extends [Kind<F, Env, infer E, infer A>]
        ? A
        : never
    }[keyof Types]
  >
}
