import type { Show } from "../../Show"
import { getShow as getShow_1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.0
 */
export const getShow: <A>(S: Show<A>) => Show<ReadonlyNonEmptyArray<A>> = getShow_1
