import { map_ as map__1 } from "../Readonly/NonEmptyArray/map_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const map_: <A, B>(
  fa: NonEmptyArray<A>,
  f: (a: A) => B
) => NonEmptyArray<B> = map__1 as any
