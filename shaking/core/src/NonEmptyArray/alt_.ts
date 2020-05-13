import { alt_ as alt__1 } from "../Readonly/NonEmptyArray/alt_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const alt_: <A>(
  fx: NonEmptyArray<A>,
  fy: () => NonEmptyArray<A>
) => NonEmptyArray<A> = alt__1 as any
