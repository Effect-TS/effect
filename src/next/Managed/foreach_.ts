import * as T from "./deps"
import { Managed } from "./managed"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar_`.
 * If you do not need the results, see `foreachUnit_` for a more efficient implementation.
 */
export const foreach_ = <S, R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<S, R, E, B>
) =>
  new Managed<S, R, E, readonly B[]>(
    T.map_(
      T.foreach_(as, (a) => f(a).effect),
      (res) => {
        const fins = res.map((k) => k[0])
        const as = res.map((k) => k[1])

        return [(e) => T.foreach_(fins.reverse(), (fin) => fin(e)), as]
      }
    )
  )
