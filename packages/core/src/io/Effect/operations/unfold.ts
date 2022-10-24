import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import type { Option } from "@fp-ts/data/Option"

/**
 * Constructs a `Chunk` by repeatedly applying the effectual function `f` as
 * long as it returns `Some`.
 *
 * @tsplus static effect/core/io/Effect.Ops unfold
 * @category constructors
 * @since 1.0.0
 */
export function unfold<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, Option<readonly [A, S]>>
): Effect<R, E, Chunk.Chunk<A>> {
  return unfoldLoop(s, f, List.empty()).map((list) => Chunk.fromIterable(List.reverse(list)))
}

function unfoldLoop<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, Option<readonly [A, S]>>,
  builder: List.List<A>
): Effect<R, E, List.List<A>> {
  return f(s).flatMap((o) => {
    if (o._tag === "Some") {
      return unfoldLoop(o.value[1], f, pipe(builder, List.prepend(o.value[0])))
    } else {
      return Effect.succeed(builder)
    }
  })
}
