// tracing: off

import "../../../Operator"

import * as FA from "../../../FreeAssociative"
import * as L from "../../../Persistent/List"
import * as Channel from "../Channel"

/**
 * Consumes a stream of input values and produces a final result, without
 * producing any output.
 */
export interface Sink<R, E, L, I, A>
  extends Channel.Channel<R, E, L, I, never, void, A> {}

function sinkArrayGo<A>(
  fa: FA.FreeAssociative<A>
): Sink<unknown, never, never, A, FA.FreeAssociative<A>> {
  return Channel.needInput(
    (i: A) => sinkArrayGo(FA.append_(fa, i)),
    () => Channel.done(fa)
  )
}

/**
 * Sink that consumes the Channel to an Array
 */
export function array<A>(): Sink<unknown, never, never, A, readonly A[]> {
  return Channel.map_(sinkArrayGo(FA.init()), FA.toArray)
}

/**
 * Sink that consumes the Channel to an Array
 */
export function drain<A>(): Sink<unknown, never, never, A, void> {
  const sink: Channel.Channel<
    unknown,
    never,
    never,
    A,
    never,
    void,
    void
  > = Channel.needInput(
    () => sink,
    () => Channel.unit
  )
  return sink
}

function sinkListGo<A>(fa: L.List<A>): Sink<unknown, never, never, A, L.List<A>> {
  return Channel.needInput(
    (i: A) => sinkListGo(L.append_(fa, i)),
    () => Channel.done(fa)
  )
}

/**
 * Sink that consumes the Channel to an List
 */
export function list<A>(): Sink<unknown, never, never, A, L.List<A>> {
  return sinkListGo(L.empty())
}
