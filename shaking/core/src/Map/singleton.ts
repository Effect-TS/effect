import * as RM from "../Readonly/Map/singleton"

/**
 * Create a map with one key/value pair
 *
 * @since 2.0.0
 */
export const singleton: <K, A>(k: K, a: A) => Map<K, A> = RM.singleton as any
