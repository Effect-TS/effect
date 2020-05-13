import type { Option } from "../Option"
import { insertAt as insertAt_1 } from "../Readonly/NonEmptyArray/insertAt"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const insertAt: <A>(
  i: number,
  a: A
) => (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> = insertAt_1 as any
