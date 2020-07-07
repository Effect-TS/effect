import * as T from "./deps"
import { Managed } from "./managed"

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const map_ = <S, R, E, A, B>(self: Managed<S, R, E, A>, f: (a: A) => B) =>
  new Managed<S, R, E, B>(T.map_(self.effect, ([fin, a]) => [fin, f(a)]))
