import type { Option } from "../../Option"
import { insertAt as insertAt_1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.0
 */
export function insertAt<A>(
  i: number,
  a: A
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>> {
  return insertAt_1(i, a) as any
}
