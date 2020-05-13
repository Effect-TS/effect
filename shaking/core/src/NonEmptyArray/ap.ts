import { ap as ap_1 } from "../Readonly/NonEmptyArray/ap"

import type { NonEmptyArray } from "./NonEmptyArray"

export const ap: <A>(
  fa: NonEmptyArray<A>
) => <B>(fab: NonEmptyArray<(a: A) => B>) => NonEmptyArray<B> = ap_1 as any
