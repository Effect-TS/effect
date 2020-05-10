import type { Option } from "fp-ts/lib/Option"

import { chain_ } from "./chain_"

export const chain: <A, B>(f: (a: A) => Option<B>) => (ma: Option<A>) => Option<B> = (
  f
) => (ma) => chain_(ma, f)
