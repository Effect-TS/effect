import { tail as tail_1 } from "../Readonly/NonEmptyArray/tail"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const tail: <A>(nea: NonEmptyArray<A>) => Array<A> = tail_1 as any
