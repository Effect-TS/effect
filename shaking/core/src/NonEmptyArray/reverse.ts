import { reverse as reverse_1 } from "../Readonly/NonEmptyArray/reverse"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const reverse: <A>(nea: NonEmptyArray<A>) => NonEmptyArray<A> = reverse_1 as any
