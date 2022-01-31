// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as E from "../../Either/index.js"
import * as T from "../_internal/effect.js"
import type * as M from "../_internal/managed.js"
import type { Stream } from "./definitions.js"
import { partitionEither_ } from "./partitionEither.js"

/**
 * Partition a stream using a predicate. The first stream will contain all element evaluated to true
 * and the second one will contain all element evaluated to false.
 * The faster stream may advance by up to buffer elements further than the slower one.
 */
export function partition_<R, E, O>(
  self: Stream<R, E, O>,
  p: (o: O) => boolean,
  buffer = 16
): M.Managed<R, never, Tp.Tuple<[Stream<unknown, E, O>, Stream<unknown, E, O>]>> {
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
