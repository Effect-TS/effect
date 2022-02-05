// ets_tracing: off

import * as core from "../../../../Effect/core.js"
import type { Effect } from "../../../../Effect/effect.js"
import type * as Chunk from "../core.js"
import { concreteId } from "../definition.js"

function loop<A, R, E, S>(
  s: S,
  iterator: Iterator<ArrayLike<A>, any, undefined>,
  array: ArrayLike<A>,
  i: number,
  length: number,
  pred: (s: S) => boolean,
  f: (s: S, a: A) => Effect<R, E, S>
): Effect<R, E, S> {
  if (i < length) {
    if (pred(s)) {
      return core.chain_(f(s, array[i]!), (s1) =>
        loop(s1, iterator, array, i + 1, length, pred, f)
      )
    } else {
      return core.succeed(s)
    }
  } else {
    const next = iterator.next()

    if (next.done) {
      return core.succeed(s)
    } else {
      const arr = next.value
      return core.suspend(() => loop(s, iterator, arr, 0, arr.length, pred, f))
    }
  }
}

/**
 * Folds over the elements in this chunk from the left.
 * Stops the fold early when the condition is not fulfilled.
 */
export function reduceWhileEffect_<A, R, E, S>(
  self: Chunk.Chunk<A>,
  s: S,
  pred: (s: S) => boolean,
  f: (s: S, a: A) => Effect<R, E, S>
): Effect<R, E, S> {
  const iterator = concreteId(self).arrayLikeIterator()
  const next = iterator.next()

  if (next.done) {
    return core.succeed(s)
  } else {
    const array = next.value
    const length = array.length

    return loop(s, iterator, array, 0, length, pred, f)
  }
}

/**
 * Folds over the elements in this chunk from the left.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @ets_data_first reduceWhileEffect_
 */
export function reduceWhileEffect<A, R, E, S>(
  s: S,
  pred: (s: S) => boolean,
  f: (s: S, a: A) => Effect<R, E, S>
): (self: Chunk.Chunk<A>) => Effect<R, E, S> {
  return (self) => reduceWhileEffect_(self, s, pred, f)
}
