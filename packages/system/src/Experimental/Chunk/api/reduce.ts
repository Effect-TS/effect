import type * as Chunk from "../core"

/**
 * Folds over the elements in this chunk from the left.
 */
export function reduce_<A, S>(self: Chunk.Chunk<A>, s: S, f: (s: S, a: A) => S): S {
  const iterator = self.arrayLikeIterator()
  let next = iterator.next()
  let s1 = s

  while (!next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      s1 = f(s1, a)
      i++
    }
    next = iterator.next()
  }

  return s1
}

/**
 * Folds over the elements in this chunk from the left.
 *
 * @dataFirst reduce_
 */
export function reduce<A, S>(s: S, f: (s: S, a: A) => S): (self: Chunk.Chunk<A>) => S {
  return (self) => reduce_(self, s, f)
}
