// tracing: off

import * as FA from "../../FreeAssociative"
import * as O from "../../Option"
import * as L from "../../Persistent/List"
import * as Channel from "../Channel"
import type { Pipeline } from "../Pipeline/index"

/**
 * Consumes a stream of input values and produces a final result, without
 * producing any output.
 */
export interface Sink<R, E, I, A> extends Pipeline<R, E, I, void, A> {}

function sinkArrayGo<A>(
  fa: FA.FreeAssociative<A>
): Sink<unknown, never, A, FA.FreeAssociative<A>> {
  return Channel.needInput(
    (i: A) => sinkArrayGo(FA.append_(fa, i)),
    () => Channel.done(fa)
  )
}

/**
 * Sink that consumes the Pipeline to an Array
 */
export function array<A>(): Sink<unknown, never, A, readonly A[]> {
  return Channel.map_(sinkArrayGo(FA.init()), FA.toArray)
}

/**
 * Sink that consumes the Pipeline to an Array
 */
export function drain<A>(): Sink<unknown, never, A, void> {
  const sink: Sink<unknown, never, A, void> = Channel.needInput(
    () => sink,
    () => Channel.unit
  )
  return sink
}

function sinkListGo<A>(fa: L.List<A>): Sink<unknown, never, A, L.List<A>> {
  return Channel.needInput(
    (i: A) => sinkListGo(L.append_(fa, i)),
    () => Channel.done(fa)
  )
}

/**
 * Sink that consumes the Pipeline to an List
 */
export function list<A>(): Sink<unknown, never, A, L.List<A>> {
  return sinkListGo(L.empty())
}

/**
 * Wait for a single input value from upstream. If no data is available,
 * returns `Nothing`. Once `await` returns `Nothing`, subsequent calls will
 * also return `Nothing`.
 */
function sinkAwait<A>(): Sink<unknown, never, A, O.Option<A>> {
  return Channel.needInput(
    (i: A) => Channel.done(O.some(i)),
    () => Channel.done(O.none)
  )
}

export { sinkAwait as await }
