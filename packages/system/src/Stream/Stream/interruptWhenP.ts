// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as P from "../../Promise/index.js"
import * as Pull from "../../Stream/Pull/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import { Stream } from "./definitions.js"

/**
 * Interrupts the evaluation of this stream when the provided promise resolves. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function interruptWhenP_<R, E, E1, O>(
  self: Stream<R, E, O>,
  p: P.Promise<E1, never>
): Stream<R, E | E1, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("as", () => self.proc),
      M.bind("done", () => Ref.makeManagedRef(false)),
      M.let(
        "asPull",
        ({ done }): T.Effect<unknown, O.Option<E1>, never> =>
          T.zipRight_(
            T.zipRight_(T.asSomeError(P.await(p)), done.set(true)),
            T.fail(O.none)
          )
      ),
      M.let("pull", ({ as, asPull, done }) =>
        T.chain_(
          T.zipWith_(done.get, P.isDone(p), (a, b) => [a, b] as const),
          ([a, b]): T.Effect<R, O.Option<E | E1>, A.Chunk<O>> => {
            if (a) {
              return Pull.end
            } else if (b) {
              return asPull
            } else {
              return T.transplant((graft) => T.raceFirst_(graft(as), asPull))
            }
          }
        )
      ),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Interrupts the evaluation of this stream when the provided promise resolves. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function interruptWhenP<E1>(p: P.Promise<E1, never>) {
  return <R, E, O>(self: Stream<R, E, O>) => interruptWhenP_(self, p)
}
