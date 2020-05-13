import { flatten as flatten_1 } from "../Readonly/NonEmptyArray/flatten"

import type { NonEmptyArray } from "./NonEmptyArray"

export const flatten: <A>(
  mma: NonEmptyArray<NonEmptyArray<A>>
) => NonEmptyArray<A> = flatten_1 as any
