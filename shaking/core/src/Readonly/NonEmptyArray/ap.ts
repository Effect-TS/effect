import { ap as ap_1 } from "../Array"

import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const ap: <A>(
  fa: ReadonlyNonEmptyArray<A>
) => <B>(
  fab: ReadonlyNonEmptyArray<(a: A) => B>
) => ReadonlyNonEmptyArray<B> = ap_1 as any
