import { getShow as getShow_1 } from "../Readonly/Record"
import type { Show } from "../Show"

/**
 * @since 2.0.0
 */
export const getShow: <A>(S: Show<A>) => Show<Record<string, A>> = getShow_1
