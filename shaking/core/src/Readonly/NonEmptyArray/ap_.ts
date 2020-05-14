import { ap_ as ap_1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const ap_: <A, B>(
  fab: ReadonlyNonEmptyArray<(a: A) => B>,
  fa: ReadonlyNonEmptyArray<A>
) => ReadonlyNonEmptyArray<B> = ap_1 as any
