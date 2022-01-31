// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as P from "../../Promise/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

/**
 * Halts the evaluation of this stream when the provided promise resolves.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function haltWhenP_<R, E, E1, O>(
  self: Stream<R, E, O>,
  p: P.Promise<E1, never>
) {
  return new Stream(
    pipe(
      M.do,
      M.bind("as", () => self.proc),
      M.bind("done", () => T.toManaged(Ref.makeRef(false))),
      M.let("pull", ({ as, done }) =>
        T.chain_(done.get, (_) => {
          if (_) {
            return Pull.end
          } else {
            return T.chain_(
              P.poll(p),
              O.fold(
                () => as,
                (v) =>
                  pipe(
                    done.set(true),
                    T.zipRight(T.mapError_(v, (_) => O.some<E | E1>(_))),
                    T.zipRight(Pull.end)
                  )
              )
            )
          }
        })
      ),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Halts the evaluation of this stream when the provided promise resolves.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function haltWhenP<E1>(p: P.Promise<E1, never>) {
  return <R, E, O>(self: Stream<R, E, O>) => haltWhenP_(self, p)
}
