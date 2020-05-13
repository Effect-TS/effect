import { of as of_1 } from "../Readonly/NonEmptyArray/of"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const of: <A>(a: A) => NonEmptyArray<A> = of_1 as any
