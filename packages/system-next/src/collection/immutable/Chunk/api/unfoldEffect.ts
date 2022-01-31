import type { Option } from "../../../../data/Option"
import { Effect } from "../../../../io/Effect/definition"
import type { Tuple } from "../../Tuple"
import type { Chunk } from "../core"
import { append_, empty } from "../core"

function loop<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, Option<Tuple<[A, S]>>>,
  builder: Chunk<A>,
  __etsTrace?: string
): Effect<R, E, Chunk<A>> {
  return f(s).flatMap((o) => {
    if (o.isSome()) {
      return loop(o.value.get(1), f, append_(builder, o.value.get(0)))
    } else {
      return Effect.succeedNow(builder)
    }
  })
}

/**
 * Constructs a `Chunk` by repeatedly applying the effectual function `f` as
 * long as it returns `Some`.
 */
export function unfoldEffect<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, Option<Tuple<[A, S]>>>,
  __etsTrace?: string
): Effect<R, E, Chunk<A>> {
  return loop(s, f, empty())
}
