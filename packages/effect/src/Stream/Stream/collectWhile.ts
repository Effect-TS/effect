import * as A from "../../Array"
import * as T from "../../Effect"
import { pipe } from "../../Function"
import * as M from "../../Managed"
import * as O from "../../Option"
import * as Ref from "../../Ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhile_<R, E, O, O2>(
  self: Stream<R, E, O>,
  f: (o: O) => O.Option<O2>
): Stream<R, E, O2> {
  return new Stream(
    pipe(
      M.do,
      M.bind("chunks", () => self.proc),
      M.bind("doneRef", () => T.toManaged_(Ref.makeRef(false))),
      M.let("pull", ({ chunks, doneRef }) =>
        T.chain_(doneRef.get, (done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              T.do,
              T.bind("chunk", () => chunks),
              T.chain(({ chunk }) => {
                const remaining = A.collectWhile_(chunk, f)

                return T.as_(
                  T.when_(doneRef.set(true), () => remaining.length < chunk.length),
                  remaining
                )
              })
            )
          }
        })
      ),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhile<O, O2>(f: (o: O) => O.Option<O2>) {
  return <R, E>(self: Stream<R, E, O>) => collectWhile_(self, f)
}
