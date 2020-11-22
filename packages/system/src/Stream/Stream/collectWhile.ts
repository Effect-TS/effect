import type * as A from "../../Array"
import * as T from "../../Effect"
import { pipe } from "../../Function"
import * as M from "../../Managed"
import type { MutableArray } from "../../Mutable"
import * as O from "../../Option"
import * as Ref from "../../Ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Maps an array until `none` is returned
 */
function collectWhileArray<X, Y>(
  arr: A.Array<X>,
  f: (x: X) => O.Option<Y>
): A.Array<Y> {
  const result: MutableArray<Y> = []

  for (let i = 0; i < arr.length; i++) {
    const o = f(arr[i])

    if (O.isSome(o)) {
      result.push(o.value)
    } else {
      break
    }
  }

  return result
}

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhile_<R, E, O, O2>(
  self: Stream<R, E, O>,
  f: (o: O) => O.Option<O2>
): Stream<R, E, O | O2> {
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
                const remaining = collectWhileArray(chunk, f)

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
export function collectWhile<O, O2 extends O>(f: (o: O) => O.Option<O2>) {
  return <R, E>(self: Stream<R, E, O>) => collectWhile_(self, f)
}
