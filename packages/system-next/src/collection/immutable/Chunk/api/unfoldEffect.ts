import type { Effect } from "../../../../io/Effect/definition"
import { chain_ } from "../../../../io/Effect/operations/chain"
import { succeedNow } from "../../../../io/Effect/operations/succeedNow"
import * as O from "../../../../data/Option"
import type * as Tp from "../../Tuple"
import type { Chunk } from "../core"
import { append_, empty } from "../core"

function loop<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, O.Option<Tp.Tuple<[A, S]>>>,
  builder: Chunk<A>
): Effect<R, E, Chunk<A>> {
  return chain_(f(s), (o) => {
    if (O.isSome(o)) {
      return loop(o.value.get(1), f, append_(builder, o.value.get(0)))
    } else {
      return succeedNow(builder)
    }
  })
}

/**
 * Constructs a `Chunk` by repeatedly applying the effectual function `f` as
 * long as it returns `Some`.
 */
export function unfoldEffect<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, O.Option<Tp.Tuple<[A, S]>>>
): Effect<R, E, Chunk<A>> {
  return loop(s, f, empty())
}
