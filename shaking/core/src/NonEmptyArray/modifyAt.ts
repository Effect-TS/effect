import type { Option } from "../Option"
import { modifyAt as modifyAt_1 } from "../Readonly/NonEmptyArray/modifyAt"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const modifyAt: <A>(
  i: number,
  f: (a: A) => A
) => (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> = modifyAt_1 as any
