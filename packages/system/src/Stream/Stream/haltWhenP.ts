import { pipe } from "../../Function"
import * as O from "../../Option"
import * as P from "../../Promise"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

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
      M.bind("done", () => T.toManaged_(Ref.makeRef(false))),
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
                    T.andThen(T.mapError_(v, (_) => O.some<E | E1>(_))),
                    T.andThen(Pull.end)
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
