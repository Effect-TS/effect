import { pipe } from "../../Function"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import { Stream } from "./definitions"

/**
 * Intersperse stream with provided element similar to <code>List.mkString</code>.
 */
export function intersperse_<R, E, O, O1>(
  self: Stream<R, E, O>,
  middle: O1
): Stream<R, E, O | O1> {
  return new Stream(
    pipe(
      M.do,
      M.bind("state", () => Ref.makeManagedRef(true)),
      M.bind("chunks", () => self.proc),
      M.let("pull", ({ chunks, state }) =>
        T.chain_(chunks, (os) => {
          return Ref.modify_(state, (first) => {
            const builder: (O | O1)[] = []
            let flagResult = first

            for (const o of os) {
              if (flagResult) {
                flagResult = false
                builder.push(o)
              } else {
                builder.push(middle, o)
              }
            }

            return [builder, flagResult]
          })
        })
      ),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Intersperse stream with provided element similar to <code>List.mkString</code>.
 */
export function intersperse<O1>(middle: O1) {
  return <R, E, O>(self: Stream<R, E, O>) => intersperse_(self, middle)
}
