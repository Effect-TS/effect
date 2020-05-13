import { apFirst as apFirst_1 } from "../Readonly/NonEmptyArray/apFirst"

import type { NonEmptyArray } from "./NonEmptyArray"

export const apFirst: <B>(
  fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<A> = apFirst_1 as any
