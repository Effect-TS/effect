import { getShow as getShow_1 } from "../Readonly/NonEmptyArray/getShow"
import type { Show } from "../Show"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const getShow: <A>(S: Show<A>) => Show<NonEmptyArray<A>> = getShow_1
