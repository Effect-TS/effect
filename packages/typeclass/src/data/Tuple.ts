/**
 * @since 0.24.0
 */
import { dual } from "effect/Function"
import * as Tuple from "effect/Tuple"
import type * as bicovariant from "../Bicovariant.js"

const bimap: {
  <E1, E2, A, B>(onFirst: (e: E1) => E2, onSecond: (a: A) => B): (self: [E1, A]) => [E2, B]
  <E1, A, E2, B>(self: [E1, A], onFirst: (e: E1) => E2, onSecond: (a: A) => B): [E2, B]
} = dual(
  3,
  <E1, A, E2, B>(self: [E1, A], onFirst: (e: E1) => E2, onSecond: (a: A) => B): [E2, B] =>
    Tuple.mapBoth(self, {
      onFirst,
      onSecond
    })
)

/**
 * @category instances
 * @since 0.24.0
 */
export const Bicovariant: bicovariant.Bicovariant<Tuple.TupleTypeLambda> = {
  bimap
}
