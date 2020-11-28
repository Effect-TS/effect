import * as A from "../../Array"
import * as T from "../../Effect"
import type { Predicate } from "../../Function"
import { pipe } from "../../Function"
import * as M from "../../Managed"
import * as O from "../../Option"
import * as Ref from "../../Ref"
import { Stream } from "./definitions"

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
      M.bind("keepDroppingRef", () => T.toManaged_(Ref.makeRef(true))),
      M.let("pull", ({ chunks, keepDroppingRef }) => {
        const go: T.Effect<R, O.Option<E>, A.Array<O>> = T.chain_(chunks, (chunk) =>
          T.chain_(keepDroppingRef.get, (keepDropping) => {
            if (!keepDropping) {
              return T.succeed(chunk)
            } else {
              const remaining = A.dropWhile_(chunk, pred)
              const empty = remaining.length <= 0

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
