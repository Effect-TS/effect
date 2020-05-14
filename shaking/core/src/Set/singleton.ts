import { singleton as singleton_1 } from "../Readonly/Set"

/**
 * Create a set with one element
 *
 * @since 2.0.0
 */
export const singleton: <A>(a: A) => Set<A> = singleton_1 as any
