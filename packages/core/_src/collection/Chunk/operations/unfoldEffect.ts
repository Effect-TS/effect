/**
 * Constructs a `Chunk` by repeatedly applying the effectual function `f` as
 * long as it returns `Some`.
 *
 * @tsplus static Chunk/Ops unfoldEffect
 */
export function unfoldEffect<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, Maybe<Tuple<[A, S]>>>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<A>> {
  return loop(s, f, Chunk.empty())
}

function loop<A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, Maybe<Tuple<[A, S]>>>,
  builder: Chunk<A>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<A>> {
  return f(s).flatMap((o) => {
    if (o.isSome()) {
      return loop(o.value.get(1), f, builder.append(o.value.get(0)))
    } else {
      return Effect.succeedNow(builder)
    }
  })
}
