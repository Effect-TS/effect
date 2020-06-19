import type { Remove, ExtractUnion, KeysDefinition, Tagged } from "../utils"

import { mapWithIndex } from "@matechs/core/Record"
import { LiteralExtract } from "@matechs/morphic-alg/primitives"

export type CtorType<C extends Ctors<any, any>> = C extends Ctors<infer A, any>
  ? A
  : never

export type Of<A, Tag extends keyof A> = {
  [key in LiteralExtract<A[Tag]> & string]: (
    a: Remove<ExtractUnion<A, Tag, key>, Tag>
  ) => A
}

export type As<A, Tag extends keyof A> = {
  [key in LiteralExtract<A[Tag]> & string]: (
    a: Remove<ExtractUnion<A, Tag, key>, Tag>
  ) => ExtractUnion<A, Tag, key>
}

export interface Ctors<A, Tag extends keyof A & string> {
  tag: Tag
  of: Of<A, Tag>
  as: As<A, Tag>
  make: (a: A) => A
  // make: (a: { [k in keyof A]: k extends Tag ? LiteralExtract<A[k]> : A[k] }) => A
}

export const Ctors = <A extends Tagged<Tag>, Tag extends string>(tag: Tag) => (
  keys: KeysDefinition<A, Tag>
): Ctors<A, Tag> => {
  const ctors = mapWithIndex((key, _) => (props: object) => ({
    [tag]: key,
    ...props
  }))(keys)
  return {
    of: ctors as Of<A, Tag>,
    as: ctors as As<A, Tag>,
    make: <A>(a: A) => a,
    tag
  }
}
