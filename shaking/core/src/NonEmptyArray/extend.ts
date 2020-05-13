import { extend as extend_1 } from "../Readonly/NonEmptyArray/extend"

import type { NonEmptyArray } from "./NonEmptyArray"

export const extend: <A, B>(
  f: (fa: NonEmptyArray<A>) => B
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = extend_1 as any
