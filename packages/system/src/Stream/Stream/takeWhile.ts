import * as A from "../../Chunk"
import type { Predicate } from "../../Function"
import { pipe } from "../../Function"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { chunk } from "../Take"
import { Stream } from "./definitions"

/**
 * Takes all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function takeWhile_<R, E, O>(
  self: Stream<R, E, O>,
  pred: Predicate<O>
): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("chunks", () => self.proc),
      M.bind("doneRef", () => T.toManaged_(Ref.makeRef(false))),
      M.let("pull", ({ chunks, doneRef }) =>
        T.chain_(doneRef.get, (_) => {
          if (_) {
            return Pull.end
          } else {
            return pipe(
              T.do,
              T.bind("chunk", () => chunks),
              T.let("taken", ({ chunk }) => A.takeWhile_(chunk, pred)),
              T.tap(({ taken }) =>
                T.when_(doneRef.set(true), () => taken.length < chunk.length)
              ),
              T.map(({ taken }) => taken)
            )
          }
        })
      ),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Takes all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function takeWhile<O>(pred: Predicate<O>) {
  return <R, E>(self: Stream<R, E, O>) => takeWhile_(self, pred)
}
