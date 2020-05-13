import { zip as zip_1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.1
 */
export const zip: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  fb: ReadonlyNonEmptyArray<B>
) => ReadonlyNonEmptyArray<readonly [A, B]> = zip_1 as any
