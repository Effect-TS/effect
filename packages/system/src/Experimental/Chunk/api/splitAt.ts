import * as Chunk from "../core"

/**
 * Returns two splits of this chunk at the specified index.
 */
export function splitAt_<A>(
  self: Chunk.Chunk<A>,
  n: number
): readonly [Chunk.Chunk<A>, Chunk.Chunk<A>] {
  return [Chunk.take_(self, n), Chunk.drop_(self, n)]
}

/**
 * Returns two splits of this chunk at the specified index.
 *
 * @dataFirst splitAt_
 */
export function splitAt(
  n: number
): <A>(self: Chunk.Chunk<A>) => readonly [Chunk.Chunk<A>, Chunk.Chunk<A>] {
  return (self) => splitAt_(self, n)
}
