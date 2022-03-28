import type { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. The element order is
 * not enforced by this combinator, and elements may be reordered.
 *
 * @tsplus fluent ets/Stream mapEffectParUnordered
 */
export function mapEffectParUnordered_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  n: number,
  f: (a: A) => Effect<R1, E1, B>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, B> {
  return self.flatMapPar(n, (a) => Stream.fromEffect(f(a)))
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. The element order is
 * not enforced by this combinator, and elements may be reordered.
 */
export const mapEffectParUnordered = Pipeable(mapEffectParUnordered_)
