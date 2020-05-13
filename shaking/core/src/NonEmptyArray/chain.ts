import { chain as chain_1 } from "../Readonly/NonEmptyArray/chain"

import type { NonEmptyArray } from "./NonEmptyArray"

export const chain: <A, B>(
  f: (a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = chain_1 as any
