import * as FA from "../../FreeAssociative"
import * as O from "../../Option"
import * as L from "../../Persistent/List"
import * as Channel from "../Channel"
import type { Conduit } from "../Conduit/index"

/**
 * Consumes a stream of input values and produces a final result, without
 * producing any output.
 */
export type Sink<R, E, I, A> = Conduit<R, E, I, never, A>

function sinkArrayGo<A>(
  fa: FA.FreeAssociative<A>
): Sink<unknown, never, A, FA.FreeAssociative<A>> {
  return new Channel.NeedInput(
    (i) => sinkArrayGo(FA.append_(fa, i)),
    () => new Channel.Done(fa)
  )
}

/**
 * Sink that consumes the Conduit to an Array
 */
export function array<A>(): Sink<unknown, never, A, readonly A[]> {
  return Channel.map_(sinkArrayGo(FA.init()), FA.toArray)
}

/**
 * Sink that consumes the Conduit to an Array
 */
export function drain<A>(): Sink<unknown, never, A, void> {
  const sink: Sink<unknown, never, A, void> = new Channel.NeedInput(
    () => sink,
    () => Channel.doneUnit as Sink<unknown, never, A, void>
  )
  return sink
}

function sinkListGo<A>(fa: L.List<A>): Sink<unknown, never, A, L.List<A>> {
  return new Channel.NeedInput(
    (i) => sinkListGo(L.append_(fa, i)),
    () => new Channel.Done(fa)
  )
}

/**
 * Sink that consumes the Conduit to an List
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
  return new Channel.NeedInput(
    (i) => new Channel.Done(O.some(i)),
    () => new Channel.Done(O.none)
  )
}

export { sinkAwait as await }
