import type { Option } from "../Option"
import { updateAt as updateAt_1 } from "../Readonly/NonEmptyArray/updateAt"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const updateAt: <A>(
  i: number,
  a: A
) => (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> = updateAt_1 as any
