import type * as A from "../../Array"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as P from "../../Promise"
import * as Pull from "../../Stream/Pull"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import { Stream } from "./definitions"

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
          T.andThen_(T.andThen_(T.asSomeError(P.await(p)), done.set(true)), Pull.end)
      ),
      M.let("pull", ({ as, asPull, done }) =>
        T.chain_(
          T.zipWith_(done.get, P.isDone(p), (a, b) => [a, b] as const),
          ([a, b]): T.Effect<R, O.Option<E | E1>, A.Array<O>> => {
            if (a) {
              return Pull.end
            } else if (b) {
              return asPull
            } else {
              return T.raceFirst_(as, asPull)
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
