import { toArray } from "../Readonly/Array/toArray"

/**
 * @since 2.0.0
 */
export const copy: <A>(as: Array<A>) => Array<A> = toArray
