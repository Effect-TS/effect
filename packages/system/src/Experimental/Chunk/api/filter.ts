import * as Chunk from "../core"

/**
 * Returns a filtered subset of this chunk.
 */
export function filter_<A>(self: Chunk.Chunk<A>, f: (a: A) => boolean): Chunk.Chunk<A> {
  const iterator = self.arrayLikeIterator()
  let next = iterator.next()
  let builder = Chunk.empty<A>()
  while (!next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      if (f(a)) {
        builder = Chunk.append_(builder, a)
      }
      i++
    }
    next = iterator.next()
  }

  return builder
}

/**
 * Returns a filtered subset of this chunk.
 *
 * @dataFirst filter_
 */
export function filter<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  return (self) => filter_(self, f)
}
