import * as C from "../../Cause/core"
import * as Either from "../../Either"
import { pipe } from "../../Function"
import * as Option from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as Sink from "../Sink"
import type { Stream } from "./definitions"

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function runManaged_<R, R1, E, E1, O, B>(
  self: Stream<R, E, O>,
  sink: Sink.Sink<R1, E1, O, any, B>
): M.Managed<R & R1, E1 | E, B> {
  return pipe(
    M.zip_(self.proc, sink.push),
    M.mapM(([pull, push]) => {
      const go: T.Effect<R1 & R, E1 | E, B> = T.foldCauseM_(
        pull,
        (c): T.Effect<R1, E1 | E, B> =>
          pipe(
            C.sequenceCauseOption(c),
            Option.fold(
              () =>
                T.foldCauseM_(
                  push(Option.none),
                  (c) =>
                    pipe(
                      c,
                      C.map(([_]) => _),
                      C.sequenceCauseEither,
                      Either.fold(T.halt, T.succeed)
                    ),
                  () => T.die("empty stream / empty sinks")
                ),
              T.halt
            )
          ),
        (os) =>
          T.foldCauseM_(
            push(Option.some(os)),
            (c): T.Effect<unknown, E1, B> =>
              pipe(
                c,
                C.map(([_]) => _),
                C.sequenceCauseEither,
                Either.fold(T.halt, T.succeed)
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
export function runManaged<R1, E1, O, B>(sink: Sink.Sink<R1, E1, O, any, B>) {
  return <R, E>(self: Stream<R, E, O>) => runManaged_(self, sink)
}
