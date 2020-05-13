import { Option } from "../../Option"
import { updateAt as updateAt_1 } from "../Array"

import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.0
 */
export function updateAt<A>(
  i: number,
  a: A
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>> {
  return updateAt_1(i, a) as any
}
