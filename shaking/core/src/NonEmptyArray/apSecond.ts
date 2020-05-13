import { apSecond as apSecond_1 } from "../Readonly/NonEmptyArray/apSecond"

import type { NonEmptyArray } from "./NonEmptyArray"

export const apSecond: <B>(
  fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<B> = apSecond_1 as any
