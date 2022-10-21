/**
 * Constructs a `Chunk` by repeatedly applying the effectual function `f` as
 * long as it returns `Some`.
 *
 * @tsplus static effect/core/io/Effect.Ops unfold
 */
export function unfold<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, Maybe<readonly [A, S]>>
): Effect<R, E, Chunk<A>> {
  return unfoldLoop(s, f, Chunk.empty())
}

function unfoldLoop<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, Maybe<readonly [A, S]>>,
  builder: Chunk<A>
): Effect<R, E, Chunk<A>> {
  return f(s).flatMap((o) => {
    if (o.isSome()) {
      return unfoldLoop(o.value[1], f, builder.append(o.value[0]))
    } else {
      return Effect.succeed(builder)
    }
  })
}
