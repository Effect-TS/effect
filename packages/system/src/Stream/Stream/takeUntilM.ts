// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

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
      M.bind("keepTakingRef", () => T.toManaged(Ref.makeRef(true))),
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
                  T.asSomeError(
                    A.takeWhileEffect_(chunk, (_) => T.map_(pred(_), (r) => !r))
                  )
                ),
                T.let("last", ({ chunk, taken }) =>
                  A.take_(A.drop_(chunk, A.size(taken)), 1)
                ),
                T.tap(({ last }) =>
                  T.when_(keepTakingRef.set(false), () => !A.isEmpty(last))
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
