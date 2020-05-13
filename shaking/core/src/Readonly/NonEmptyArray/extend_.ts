import { extend_ as extend__1 } from "../Array"

import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const extend_: <A, B>(
  wa: ReadonlyNonEmptyArray<A>,
  f: (wa: ReadonlyNonEmptyArray<A>) => B
) => ReadonlyNonEmptyArray<B> = extend__1 as any
