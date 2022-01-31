// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import { Stream } from "./definitions.js"

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
            let builder = A.empty<O | O1>()
            let flagResult = first

            for (const o of os) {
              if (flagResult) {
                flagResult = false
                builder = A.append_(builder, o)
              } else {
                builder = A.append_(A.append_(builder, middle), o)
              }
            }

            return Tp.tuple(builder, flagResult)
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
