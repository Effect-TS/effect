import type { Chunk } from "../definition"
import {
  _Empty,
  concrete,
  EmptyTypeId,
  SingletonTypeId,
  Slice,
  SliceTypeId
} from "../definition"

/**
 * Drops the first `n` elements.
 *
 * @tsplus fluent ets/Chunk drop
 */
export function drop_<A>(self: Chunk<A>, n: number): Chunk<A> {
  concrete(self)
  if (n <= 0) {
    return self
  } else if (n >= self.length) {
    return _Empty
  } else {
    const len = self.length
    switch (self._typeId) {
      case EmptyTypeId: {
        return _Empty
      }
      case SliceTypeId: {
        return new Slice(self.chunk, self.offset + n, self.length - n)
      }
      case SingletonTypeId: {
        if (n > 0) {
          return _Empty
        }
        return self
      }
      default: {
        return new Slice(self, n, len - n)
      }
    }
  }
}

/**
 * Drops the first n elements
 *
 * @ets_data_first drop_
 */
export function drop(n: number): <A>(self: Chunk<A>) => Chunk<A> {
  return (self) => self.drop(n)
}
