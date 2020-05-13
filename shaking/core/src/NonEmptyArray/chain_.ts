import { chain_ as chain__1 } from "../Readonly/NonEmptyArray/chain_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const chain_: <A, B>(
  fa: NonEmptyArray<A>,
  f: (a: A) => NonEmptyArray<B>
) => NonEmptyArray<B> = chain__1 as any
