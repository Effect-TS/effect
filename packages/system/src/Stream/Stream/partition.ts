import * as E from "../../Either"
import * as T from "../_internal/effect"
import type * as M from "../_internal/managed"
import type { Stream } from "./definitions"
import { partitionEither_ } from "./partitionEither"

/**
 * Partition a stream using a predicate. The first stream will contain all element evaluated to true
 * and the second one will contain all element evaluated to false.
 * The faster stream may advance by up to buffer elements further than the slower one.
 */
export function partition_<R, E, O>(
  self: Stream<R, E, O>,
  p: (o: O) => boolean,
  buffer = 16
): M.Managed<R, E, readonly [Stream<unknown, E, O>, Stream<unknown, E, O>]> {
  return partitionEither_(
    self,
    (a) => (p(a) ? T.succeed(E.left(a)) : T.succeed(E.right(a))),
    buffer
  )
}

/**
 * Partition a stream using a predicate. The first stream will contain all element evaluated to true
 * and the second one will contain all element evaluated to false.
 * The faster stream may advance by up to buffer elements further than the slower one.
 */
export function partition<O>(p: (o: O) => boolean, buffer = 16) {
  return <R, E>(self: Stream<R, E, O>) => partition_(self, p, buffer)
}
