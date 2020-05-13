import { zipWith as zipWith_1 } from "../Readonly/NonEmptyArray/zipWith"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.5.1
 */
export const zipWith: <A, B, C>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
) => NonEmptyArray<C> = zipWith_1 as any
