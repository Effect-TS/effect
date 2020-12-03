import { pipe } from "../../Function"
import * as O from "../../Option"
import * as Pull from "../../Stream/Pull"
import * as T from "../_internal/effect"
import * as F from "../_internal/fiber"
import * as M from "../_internal/managed"
import { Stream } from "./definitions"

/**
 * Interrupts the evaluation of this stream when the provided IO completes. The given
 * IO will be forked as part of this stream, and its success will be discarded. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the IO completes with a failure before the stream completes, the returned stream
 * will emit that failure.
 */
export function interruptWhen_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  io: T.Effect<R1, E1, any>
): Stream<R1 & R, E | E1, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("as", () => self.proc),
      M.bind("runIO", () =>
        T.forkManaged<R1, O.Option<E | E1>, never>(
          pipe(T.asSomeError(io), T.andThen(Pull.end))
        )
      ),
      M.map(({ as, runIO }) => pipe(F.join(runIO), T.disconnect, T.raceFirst(as)))
    )
  )
}

/**
 * Interrupts the evaluation of this stream when the provided IO completes. The given
 * IO will be forked as part of this stream, and its success will be discarded. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the IO completes with a failure before the stream completes, the returned stream
 * will emit that failure.
 */
export function interruptWhen<R1, E1>(io: T.Effect<R1, E1, any>) {
  return <R, E, O>(self: Stream<R, E, O>) => interruptWhen_(self, io)
}
