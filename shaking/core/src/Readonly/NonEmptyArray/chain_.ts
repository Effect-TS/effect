import { chain_ as chain__1 } from "../Array"

import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const chain_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  f: (a: A) => ReadonlyNonEmptyArray<B>
) => ReadonlyNonEmptyArray<B> = chain__1 as any
