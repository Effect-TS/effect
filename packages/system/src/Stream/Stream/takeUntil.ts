// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import type { Predicate } from "../../Function/index.js"
import { not, pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

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
      M.bind("keepTakingRef", () => T.toManaged(Ref.makeRef(true))),
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
                A.take_(A.drop_(chunk, A.size(taken)), 1)
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
