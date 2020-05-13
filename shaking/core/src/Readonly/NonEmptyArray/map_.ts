import { map_ as map__1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const map_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  f: (a: A) => B
) => ReadonlyNonEmptyArray<B> = map__1 as any
