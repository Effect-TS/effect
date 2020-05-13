import { flatten as flatten_1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const flatten: <A>(
  mma: ReadonlyNonEmptyArray<ReadonlyNonEmptyArray<A>>
) => ReadonlyNonEmptyArray<A> = flatten_1 as any
