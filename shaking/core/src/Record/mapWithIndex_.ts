import { mapWithIndex_ as mapWithIndex__1 } from "../Readonly/Record"

export const mapWithIndex_: <A, B>(
  fa: Record<string, A>,
  f: (i: string, a: A) => B
) => Record<string, B> = mapWithIndex__1
