import { extend_ as extend__1 } from "../Readonly/NonEmptyArray/extend_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const extend_: <A, B>(
  wa: NonEmptyArray<A>,
  f: (wa: NonEmptyArray<A>) => B
) => NonEmptyArray<B> = extend__1 as any
