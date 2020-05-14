import { getShow as getShow_1 } from "../Readonly/Set"
import type { Show } from "../Show"

/**
 * @since 2.0.0
 */
export const getShow: <A>(S: Show<A>) => Show<Set<A>> = getShow_1
