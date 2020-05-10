import type { Option } from "fp-ts/lib/Option"

import { chain_ } from "./chain_"
import { map_ } from "./map_"

export const chainFirst = <A, B>(f: (a: A) => Option<B>) => (
  ma: Option<A>
): Option<A> => chain_(ma, (a) => map_(f(a), () => a))
