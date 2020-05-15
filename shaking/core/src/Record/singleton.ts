import { singleton as singleton_1 } from "../Readonly/Record"

/**
 * Create a record with one key/value pair
 *
 * @since 2.0.0
 */
export const singleton: <K extends string, A>(k: K, a: A) => Record<K, A> = singleton_1
