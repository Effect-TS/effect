// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import type { Predicate } from "../../Function/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import { Stream } from "./definitions.js"

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function dropWhile_<R, E, O>(
  self: Stream<R, E, O>,
  pred: Predicate<O>
): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("chunks", () => self.proc),
      M.bind("keepDroppingRef", () => T.toManaged(Ref.makeRef(true))),
      M.let("pull", ({ chunks, keepDroppingRef }) => {
        const go: T.Effect<R, O.Option<E>, A.Chunk<O>> = T.chain_(chunks, (chunk) =>
          T.chain_(keepDroppingRef.get, (keepDropping) => {
            if (!keepDropping) {
              return T.succeed(chunk)
            } else {
              const remaining = A.dropWhile_(chunk, pred)
              const empty = A.isEmpty(remaining)

              if (empty) {
                return go
              } else {
                return T.as_(keepDroppingRef.set(false), remaining)
              }
            }
          })
        )

        return go
      }),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function dropWhile<O>(pred: Predicate<O>) {
  return <R, E>(self: Stream<R, E, O>) => dropWhile_(self, pred)
}
