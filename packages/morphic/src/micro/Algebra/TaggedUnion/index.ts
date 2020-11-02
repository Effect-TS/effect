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
  taggedUnion<Tag extends string, A, L>(
    tag: Tag,
    types: TaggedTypes<F, Tag, A, L, Env>,
    config?: Named<
      ConfigsForType<
        Env,
        TaggedValues<Tag, L>[keyof L],
        TaggedValues<Tag, A>[keyof A],
        TaggedUnionConfig<TaggedValues<Tag, L>>
      >
    >
  ): Kind<F, Env, TaggedValues<Tag, L>[keyof L], TaggedValues<Tag, A>[keyof A]>
}
