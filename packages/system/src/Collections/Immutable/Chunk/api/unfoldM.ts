import * as core from "../../../../Effect/core"
import type { Effect } from "../../../../Effect/effect"
import * as O from "../../../../Option"
import type { Chunk } from "../core"
import { append_, empty } from "../core"

function loop<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, O.Option<readonly [A, S]>>,
  builder: Chunk<A>
): Effect<R, E, Chunk<A>> {
  return core.chain_(f(s), (o) => {
    if (O.isSome(o)) {
      return loop(o.value[1], f, append_(builder, o.value[0]))
    } else {
      return core.succeed(builder)
    }
  })
}

/**
 * Constructs a `Chunk` by repeatedly applying the effectual function `f` as
 * long as it returns `Some`.
 */
export function unfoldM_<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, O.Option<readonly [A, S]>>
): Effect<R, E, Chunk<A>> {
  return loop(s, f, empty())
}

/**
 * Constructs a `Chunk` by repeatedly applying the effectual function `f` as
 * long as it returns `Some`.
 *
 * @dataFirst unfoldM_
 */
export function unfoldM<A, R, E, S>(
  f: (s: S) => Effect<R, E, O.Option<readonly [A, S]>>
): (s: S) => Effect<R, E, Chunk<A>> {
  return (s) => unfoldM_(s, f)
}
