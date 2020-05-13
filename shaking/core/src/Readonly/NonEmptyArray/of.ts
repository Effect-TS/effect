import { of as of_1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.0
 */
export const of: <A>(a: A) => ReadonlyNonEmptyArray<A> = of_1 as any
