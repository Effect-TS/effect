/**
 * @tsplus static ets/Pull/Ops emitChunk
 */
export function emitChunk<A>(as: Chunk<A>, __tsplusTrace?: string): Effect<never, never, Chunk<A>> {
  return Effect.succeed(as)
}
