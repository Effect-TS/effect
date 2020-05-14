import { unsafeCoerce } from "../Function"

import type { Const } from "./Const"

export const map_: <E, A, B>(
  fa: Const<E, A>,
  f: (a: A) => B
) => Const<E, B> = unsafeCoerce
