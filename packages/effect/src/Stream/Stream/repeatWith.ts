import type * as A from "../../Chunk"
import type * as CL from "../../Clock"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as SC from "../../Schedule"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "./../Pull"
import { concat_ } from "./concat"
import { Stream } from "./definitions"
import { fromEffect } from "./fromEffect"
import { map_ } from "./map"

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition and can be unified with the stream elements using the provided functions.
 */
export function repeatWith<R1, B>(schedule: SC.Schedule<R1, any, B>) {
  return <O, C, D>(f: (o: O) => C, g: (b: B) => D) => <R, E>(
    self: Stream<R, E, O>
  ): Stream<R & R1 & CL.HasClock, E, C | D> =>
    new Stream(
      pipe(
        M.do,
        M.bind("sdriver", () => T.toManaged_(SC.driver(schedule))),
        M.bind("switchPull", () =>
          M.switchable<R & R1, never, T.Effect<R1 & R, O.Option<E>, A.Chunk<C | D>>>()
        ),
        M.bind("currPull", ({ switchPull }) =>
          T.toManaged_(T.chain_(switchPull(map_(self, f).proc), Ref.makeRef))
        ),
        M.bind("doneRef", () => T.toManaged_(Ref.makeRef(false))),
        M.let("pull", ({ currPull, doneRef, sdriver, switchPull }) => {
          const go: T.Effect<
            R & R1 & CL.HasClock,
            O.Option<E>,
            A.Chunk<C | D>
          > = T.chain_(doneRef.get, (done) => {
            if (done) {
              return Pull.end
            } else {
              return T.foldM_(
                T.flatten(currPull.get),
                O.fold(
                  () => {
                    const scheduleOutput = pipe(sdriver.last, T.orDie, T.map(g))
                    const continue_ = pipe(
                      sdriver.next(undefined),
                      T.andThen(
                        switchPull(
                          concat_(map_(self, f), fromEffect(scheduleOutput)).proc
                        )
                      ),
                      T.tap((_) => currPull.set(_)),
                      T.andThen(go)
                    )
                    const halt = T.andThen_(doneRef.set(true), Pull.end)

                    return T.orElse_(continue_, () => halt)
                  },
                  (e) => T.fail(O.some(e))
                ),
                (_) => T.succeed(_)
              )
            }
          })

          return go
        }),
        M.map(({ pull }) => pull)
      )
    )
}
