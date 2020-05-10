import type { Option } from "fp-ts/lib/Option"

import { map_ } from "./map_"

export const map: <A, B>(f: (a: A) => B) => (fa: Option<A>) => Option<B> = (f) => (
  fa
) => map_(fa, f)
