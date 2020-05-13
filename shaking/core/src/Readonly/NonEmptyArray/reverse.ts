import { reverse as reverse_1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.0
 */
export const reverse: <A>(
  nea: ReadonlyNonEmptyArray<A>
) => ReadonlyNonEmptyArray<A> = reverse_1 as any
