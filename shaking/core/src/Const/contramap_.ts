import { unsafeCoerce } from "../Function"

import type { Const } from "./Const"

export const contramap_: <E, A, B>(
  fa: Const<E, A>,
  f: (b: B) => A
) => Const<E, B> = unsafeCoerce
