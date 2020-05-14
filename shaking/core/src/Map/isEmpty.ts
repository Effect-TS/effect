import * as RM from "../Readonly/Map/isEmpty"

/**
 * Test whether or not a map is empty
 *
 * @since 2.0.0
 */
export const isEmpty: <K, A>(d: Map<K, A>) => boolean = RM.isEmpty
