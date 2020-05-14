import { identity as id } from "../Function"
import type { Show } from "../Show"

import type { Identity } from "./Identity"

/**
 * @since 2.0.0
 */
export const getShow: <A>(S: Show<A>) => Show<Identity<A>> = id
