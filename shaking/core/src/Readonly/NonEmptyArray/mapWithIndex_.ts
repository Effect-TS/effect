import { mapWithIndex_ as mapWithIndex__1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const mapWithIndex_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  f: (i: number, a: A) => B
) => ReadonlyNonEmptyArray<B> = mapWithIndex__1 as any
