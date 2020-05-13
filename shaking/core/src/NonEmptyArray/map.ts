import { map as map_1 } from "../Readonly/NonEmptyArray/map"

import type { NonEmptyArray } from "./NonEmptyArray"

export const map: <A, B>(
  f: (a: A) => B
) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = map_1 as any
