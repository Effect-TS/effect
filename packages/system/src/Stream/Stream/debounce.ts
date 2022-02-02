// ets_tracing: off

import * as C from "../../Cause/index.js"
import * as CL from "../../Clock/index.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Ex from "../../Exit/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as Scope from "../../Scope/index.js"
import * as T from "../_internal/effect.js"
import * as F from "../_internal/fiber.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

export function debounce_<R, E, O>(
  self: Stream<R, E, O>,
  d: number
): Stream<R & CL.HasClock, E, O> {
  class NotStarted {
    readonly _tag = "NotStarted"
  }
  class Previous {
    readonly _tag = "Previous"
    constructor(readonly fiber: F.Fiber<never, O>) {}
  }
  class Current {
    readonly _tag = "Current"
    constructor(readonly fiber: F.Fiber<O.Option<E>, A.Chunk<O>>) {}
  }
  class Done {
    readonly _tag = "Done"
  }
  type State = NotStarted | Previous | Current | Done

  return new Stream(
    pipe(
      M.do,
      M.bind("chunks", () => self.proc),
      M.bind("ref", () =>
        pipe(
          Ref.makeRef<State>(new NotStarted()),
          T.toManagedRelease((_) =>
            T.chain_(_.get, (state) => {
              switch (state._tag) {
                case "Previous":
                  return F.interrupt(state.fiber)
                case "Current":
                  return F.interrupt(state.fiber)
                default:
                  return T.unit
              }
            })
          )
        )
      ),
      M.let("pull", ({ chunks, ref }) => {
        const store = (chunk: A.Chunk<O>): T.RIO<CL.HasClock, A.Chunk<O>> =>
          pipe(
            A.last(chunk),
            O.map((last) =>
              pipe(
                CL.sleep(d),
                T.as(last),
                T.forkDaemon,
                T.chain((f) => ref.set(new Previous(f)))
              )
            ),
            O.getOrElse(() => ref.set(new NotStarted())),
            T.as(A.empty())
          )

        return T.chain_(ref.get, (state) => {
          switch (state._tag) {
            case "Previous":
              return T.transplant((graft) =>
                pipe(
                  F.join(state.fiber),
                  T.raceWithScope(
                    graft(chunks),
                    (ex, current) => {
                      if (Ex.succeeded(ex)) {
                        return T.as_(ref.set(new Current(current)), A.single(ex.value))
                      } else {
                        return T.zipRight_(F.interrupt(current), Pull.halt(ex.cause))
                      }
                    },
                    (ex, previous) => {
                      if (Ex.succeeded(ex)) {
                        const chunk = ex.value

                        if (A.isEmpty(chunk)) {
                          return Pull.empty<O>()
                        } else {
                          return T.zipRight_(F.interrupt(previous), store(chunk))
                        }
                      } else {
                        return O.fold_(
                          C.sequenceCauseOption(ex.cause),
                          () =>
                            pipe(
                              F.join(previous),
                              T.map(A.single),
                              T.zipLeft(ref.set(new Done()))
                            ),
                          (e) => T.zipRight_(F.interrupt(previous), Pull.halt(e))
                        )
                      }
                    },
                    Scope.globalScope
                  )
                )
              )
            case "Current":
              return T.chain_(F.join(state.fiber), store)
            case "NotStarted":
              return T.chain_(chunks, store)
            case "Done":
              return Pull.end
          }
        })
      }),
      M.map(({ pull }) => pull)
    )
  )
}

export function debounce(d: number) {
  return <R, E, O>(self: Stream<R, E, O>) => debounce_(self, d)
}
