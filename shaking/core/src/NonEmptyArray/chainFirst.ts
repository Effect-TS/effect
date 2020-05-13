import { chainFirst as chainFirst_1 } from "../Readonly/NonEmptyArray/chainFirst"

import type { NonEmptyArray } from "./NonEmptyArray"

export const chainFirst: <A, B>(
  f: (a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<A> = chainFirst_1 as any
