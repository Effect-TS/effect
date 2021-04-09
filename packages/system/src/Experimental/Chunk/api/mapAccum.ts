import * as Chunk from "../core"

/**
 * Statefully maps over the chunk, producing new elements of type `B`.
 */
export function mapAccum_<A, B, S>(
  self: Chunk.Chunk<A>,
  s: S,
  f: (s: S, a: A) => readonly [S, B]
): readonly [S, Chunk.Chunk<B>] {
  const iterator = self.arrayLikeIterator()
  let next = iterator.next()
  let s1 = s
  let builder = Chunk.empty<B>()

  while (!next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      const x = f(s1, a)
      s1 = x[0]
      builder = Chunk.append_(builder, x[1])
      i++
    }
    next = iterator.next()
  }

  return [s1, builder]
}

/**
 * Statefully maps over the chunk, producing new elements of type `B`.
 *
 * @dataFirst mapAccum_
 */
export function mapAccum<A, B, S>(
  s: S,
  f: (s: S, a: A) => readonly [S, B]
): (self: Chunk.Chunk<A>) => readonly [S, Chunk.Chunk<B>] {
  return (self) => mapAccum_(self, s, f)
}
