import * as RA from "../Readonly/Array/getShow"
import type { Show } from "../Show"

/**
 * @since 2.0.0
 */
export const getShow: <A>(S: Show<A>) => Show<Array<A>> = RA.getShow
