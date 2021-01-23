import * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 */
export function takeUntilM_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  pred: (o: O) => T.Effect<R1, E1, boolean>
): Stream<R1 & R, E | E1, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("chunks", () => self.proc),
      M.bind("keepTakingRef", () => T.toManaged_(Ref.makeRef(true))),
      M.let("pull", ({ chunks, keepTakingRef }) => {
        return T.chain_(
          keepTakingRef.get,
          (keepTaking): T.Effect<R1 & R, O.Option<E | E1>, A.Chunk<O>> => {
            if (!keepTaking) {
              return Pull.end
            } else {
              return pipe(
                T.do,
                T.bind("chunk", () => chunks),
                T.bind("taken", ({ chunk }) =>
                  T.asSomeError(A.takeWhileM_(chunk, (_) => T.map_(pred(_), (r) => !r)))
                ),
                T.let("last", ({ chunk, taken }) =>
                  A.takeLeft_(A.dropLeft_(chunk, taken.length), 1)
                ),
                T.tap(({ last }) =>
                  T.when_(keepTakingRef.set(false), () => A.isNonEmpty(last))
                ),
                T.map(({ last, taken }) => A.concat_(taken, last))
              )
            }
          }
        )
      }),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 */
export function takeUntilM<R1, E1, O>(pred: (o: O) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, O>) => takeUntilM_(self, pred)
}
