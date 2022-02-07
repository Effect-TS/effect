// ets_tracing: off

import * as C from "../../Cause/index.js"
import * as E from "../../Either/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import type * as SK from "../Sink/index.js"
import type { Stream } from "./definitions.js"

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function runManaged_<R, R1, E, E1, O, B>(
  self: Stream<R, E, O>,
  sink: SK.Sink<R1, E1, O, any, B>
): M.Managed<R & R1, E1 | E, B> {
  return pipe(
    M.zip_(self.proc, sink.push),
    M.mapM(([pull, push]) => {
      const go: T.Effect<R1 & R, E1 | E, B> = T.foldCauseM_(
        pull,
        (c): T.Effect<R1, E1 | E, B> =>
          pipe(
            C.sequenceCauseOption(c),
            O.fold(
              () =>
                T.foldCauseM_(
                  push(O.none),
                  (c) =>
                    pipe(
                      c,
                      C.map((_) => _.get(0)),
                      C.sequenceCauseEither,
                      E.fold(T.halt, T.succeed)
                    ),
                  () => T.dieMessage("empty stream / empty sinks")
                ),
              T.halt
            )
          ),
        (os) =>
          T.foldCauseM_(
            push(O.some(os)),
            (c): T.Effect<unknown, E1, B> =>
              pipe(
                c,
                C.map((_) => _.get(0)),
                C.sequenceCauseEither,
                E.fold(T.halt, T.succeed)
              ),
            () => go
          )
      )
      return go
    })
  )
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function runManaged<R1, E1, O, B>(sink: SK.Sink<R1, E1, O, any, B>) {
  return <R, E>(self: Stream<R, E, O>) => runManaged_(self, sink)
}
