import { duplicate as duplicate_1 } from "../Readonly/NonEmptyArray/duplicate"

import type { NonEmptyArray } from "./NonEmptyArray"

export const duplicate: <A>(
  ma: NonEmptyArray<A>
) => NonEmptyArray<NonEmptyArray<A>> = duplicate_1 as any
