import type { Predicate } from "../../Function"
import { not } from "../../Function"
import type { Stream } from "./definitions"
import { drop_ } from "./drop"
import { dropWhile_ } from "./dropWhile"

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil_<R, E, O>(
  self: Stream<R, E, O>,
  pred: Predicate<O>
): Stream<R, E, O> {
  return drop_(dropWhile_(self, not(pred)), 1)
}

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil<O>(pred: Predicate<O>) {
  return <R, E>(self: Stream<R, E, O>) => dropUntil_(self, pred)
}
