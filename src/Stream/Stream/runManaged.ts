import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as C from "../../Cause/core"
import * as E from "../../Either"
import { pipe } from "../../Function"
import * as O from "../../Option"
import type * as Sink from "../Sink"
import type { Stream } from "./definitions"

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const runManaged = <S1, R1, E1, O, B>(
  sink: Sink.Sink<S1, R1, E1, O, any, B>
) => <S, R, E>(self: Stream<S, R, E, O>): M.Managed<S1 | S, R & R1, E1 | E, B> =>
  pipe(
    M.zip_(self.proc, sink.push),
    M.mapM(([pull, push]) => {
      const go: T.Effect<S1 | S, R1 & R, E1 | E, B> = T.foldCauseM_(
        pull,
        (c): T.Effect<S1, R1, E1 | E, B> =>
          pipe(
            C.sequenceCauseOption(c),
            O.fold(
              () =>
                T.foldCauseM_(
                  push(O.none),
                  (c) =>
                    pipe(
                      c,
                      C.map(([_]) => _),
                      C.sequenceCauseEither,
                      E.fold(T.halt, T.succeedNow)
                    ),
                  () => T.die("empty stream / empty sinks")
                ),
              T.halt
            )
          ),
        (os) =>
          T.foldCauseM_(
            push(O.some(os)),
            (c): T.Effect<never, unknown, E1, B> =>
              pipe(
                c,
                C.map(([_]) => _),
                C.sequenceCauseEither,
                E.fold(T.halt, T.succeedNow)
              ),
            () => go
          )
      )
      return go
    })
  )
