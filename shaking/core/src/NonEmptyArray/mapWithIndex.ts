import { mapWithIndex as mapWithIndex_1 } from "../Readonly/NonEmptyArray/mapWithIndex"

import type { NonEmptyArray } from "./NonEmptyArray"

export const mapWithIndex: <A, B>(
  f: (i: number, a: A) => B
) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = mapWithIndex_1 as any
