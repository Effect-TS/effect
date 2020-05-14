import * as RM from "../Readonly/Map/size"

/**
 * Calculate the number of key/value pairs in a map
 *
 * @since 2.0.0
 */
export const size: <K, A>(d: Map<K, A>) => number = RM.size
