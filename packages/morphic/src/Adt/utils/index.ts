export type ElemType<A> = A extends Array<infer E> ? E : never

export type ExtractUnion<A, Tag extends keyof A, Tags extends A[Tag]> = Extract<
  A,
  Record<Tag, Tags>
>

export type ExcludeUnion<A, Tag extends keyof A, Tags extends A[Tag]> = Exclude<
  A,
  Record<Tag, Tags>
>

export type KeysDefinition<A, Tag extends keyof A> = {
  [k in A[Tag] & string]: any
}

export type Tagged<Tag extends string> = { [t in Tag]: string }

export const isIn = <A, Tag extends keyof A>(keys: KeysDefinition<A, Tag>) => (
  k: string
) => k in keys
