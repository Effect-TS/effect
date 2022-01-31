// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import type * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as SC from "../../Schedule/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

/**
 * When the stream fails, retry it according to the given schedule
 *
 * This retries the entire stream, so will re-execute all of the stream's acquire operations.
 *
 * The schedule is reset as soon as the first element passes through the stream again.
 *
 * @param schedule Schedule receiving as input the errors of the stream
 * @return Stream outputting elements of all attempts of the stream
 */
export function retry_<R, R1, E, O>(
  self: Stream<R, E, O>,
  schedule: SC.Schedule<R1, E, unknown>
): Stream<R & R1 & CL.HasClock, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("driver", () => T.toManaged(SC.driver(schedule))),
      M.bind("currStream", () =>
        T.toManaged(Ref.makeRef<T.Effect<R, O.Option<E>, A.Chunk<O>>>(Pull.end))
      ),
      M.bind("switchStream", () =>
        M.switchable<R, never, T.Effect<R, O.Option<E>, A.Chunk<O>>>()
      ),
      M.tap(({ currStream, switchStream }) =>
        T.toManaged(T.chain_(switchStream(self.proc), currStream.set))
      ),
      M.let("pull", ({ currStream, driver, switchStream }) => {
        const loop: T.Effect<
          R & R1 & CL.HasClock,
          O.Option<E>,
          A.Chunk<O>
        > = T.catchSome_(
          T.flatten(currStream.get),
          O.fold(
            () => O.none,
            (e) =>
              O.some(
                T.foldM_(
                  driver.next(e),
                  (_) => Pull.fail(e),
                  (_) =>
                    pipe(
                      self.proc,
                      switchStream,
                      T.chain(currStream.set),
                      T.zipRight(T.tap_(loop, (_) => driver.reset))
                    )
                )
              )
          )
        )

        return loop
      }),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * When the stream fails, retry it according to the given schedule
 *
 * This retries the entire stream, so will re-execute all of the stream's acquire operations.
 *
 * The schedule is reset as soon as the first element passes through the stream again.
 *
 * @param schedule Schedule receiving as input the errors of the stream
 * @return Stream outputting elements of all attempts of the stream
 */
export function retry<R1, E>(schedule: SC.Schedule<R1, E, unknown>) {
  return <R, O>(self: Stream<R, E, O>) => retry_(self, schedule)
}
