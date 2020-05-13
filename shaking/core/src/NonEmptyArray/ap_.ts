import { ap_ as ap__1 } from "../Readonly/NonEmptyArray/ap_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const ap_: <A, B>(
  fab: NonEmptyArray<(a: A) => B>,
  fa: NonEmptyArray<A>
) => NonEmptyArray<B> = ap__1 as any
