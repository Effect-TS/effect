import { id } from "./id"
import { map_ } from "./map_"

/**
 * A schedule that recurs forever, mapping input values through the
 * specified function.
 */
export const fromFunction = <A, B>(f: (a: A) => B) => map_(id<A>(), f)
