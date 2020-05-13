import { mapWithIndex_ as mapWithIndex__1 } from "../Readonly/NonEmptyArray/mapWithIndex_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const mapWithIndex_: <A, B>(
  fa: NonEmptyArray<A>,
  f: (i: number, a: A) => B
) => NonEmptyArray<B> = mapWithIndex__1 as any
