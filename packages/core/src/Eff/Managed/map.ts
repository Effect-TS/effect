import { Managed } from "./managed"
import { map_ } from "./map_"

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const map = <A, B>(f: (a: A) => B) => <S, R, E>(self: Managed<S, R, E, A>) =>
  map_(self, f)
