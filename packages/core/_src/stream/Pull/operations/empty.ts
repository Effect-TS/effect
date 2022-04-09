/**
 * @tsplus static ets/Pull/Ops empty
 */
export function empty<A>(): IO<never, Chunk<A>> {
  return Effect.succeed(Chunk.empty<A>());
}
