import * as A from "../../Chunk"
import type { Predicate } from "../../Function"
import { not, pipe } from "../../Function"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Takes all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function takeUntil_<R, E, O>(
  self: Stream<R, E, O>,
  pred: Predicate<O>
): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("chunks", () => self.proc),
      M.bind("keepTakingRef", () => T.toManaged_(Ref.makeRef(true))),
      M.let("pull", ({ chunks, keepTakingRef }) => {
        return T.chain_(keepTakingRef.get, (keepTaking) => {
          if (!keepTaking) {
            return Pull.end
          } else {
            return pipe(
              T.do,
              T.bind("chunk", () => chunks),
              T.let("taken", ({ chunk }) => A.takeWhile_(chunk, not(pred))),
              T.let("last", ({ chunk, taken }) =>
                A.takeLeft_(A.dropLeft_(chunk, taken.length), 1)
              ),
              T.map(({ last, taken }) => A.concat_(taken, last))
            )
          }
        })
      }),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Takes all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function takeUntil<O>(pred: Predicate<O>) {
  return <R, E>(self: Stream<R, E, O>) => takeUntil_(self, pred)
}
