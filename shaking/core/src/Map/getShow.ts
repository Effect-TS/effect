import * as RM from "../Readonly/Map/getShow"
import { Show } from "../Show"

/**
 * @since 2.0.0
 */
export const getShow: <K, A>(SK: Show<K>, SA: Show<A>) => Show<Map<K, A>> = RM.getShow
