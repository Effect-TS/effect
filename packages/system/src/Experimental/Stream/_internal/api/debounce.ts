// ets_tracing: off

import * as CL from "../../../../Clock/index.js"
import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as Ex from "../../../../Exit/index.js"
import * as F from "../../../../Fiber/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"
import * as HO from "../Handoff.js"
import * as SER from "../SinkEndReason.js"
import * as CrossRight from "./crossRight.js"
import * as Managed from "./managed.js"
import * as Unwrap from "./unwrap.js"

const NotStartedTypeId = Symbol()
class NotStarted {
  readonly _typeId: typeof NotStartedTypeId = NotStartedTypeId
}

const PreviousTypeId = Symbol()
class Previous<A> {
  readonly _typeId: typeof PreviousTypeId = PreviousTypeId

  constructor(public fiber: F.Fiber<never, CK.Chunk<A>>) {}
}

const CurrentTypeId = Symbol()
class Current<E, A> {
  readonly _typeId: typeof CurrentTypeId = CurrentTypeId

  constructor(public fiber: F.Fiber<E, HO.HandoffSignal<void, E, A>>) {}
}

type DebounceState<E, A> = NotStarted | Previous<A> | Current<E, A>

/**
 * Delays the emission of values by holding new values for a set duration. If no new values
 * arrive during that time the value is emitted, however if a new value is received during the holding period
 * the previous value is discarded and the process is repeated with the new value.
 *
 * This operator is useful if you have a stream of "bursty" events which eventually settle down and you
 * only need the final event of the burst.
 *
 * @example A search engine may only want to initiate a search after a user has paused typing
 *          so as to not prematurely recommend results.
 */
export function debounce_<R, E, A>(
  self: C.Stream<R, E, A>,
  d: number
): C.Stream<CL.HasClock & R, E, A> {
  return Unwrap.unwrap(
    pipe(
      T.do,
      T.bind("scope", () => T.forkScope),
      T.bind("handoff", () => HO.make<HO.HandoffSignal<void, E, A>>()),
      T.map(({ handoff, scope }) => {
        const enqueue = (last: CK.Chunk<A>) =>
          pipe(
            T.do,
            T.bind("f", () => pipe(CL.sleep(d), T.as(last), T.forkIn(scope))),
            T.map(({ f }) => consumer(new Previous(f)))
          )

        const producer: CH.Channel<
          R & CL.HasClock,
          E,
          CK.Chunk<A>,
          unknown,
          E,
          never,
          any
        > = CH.readWithCause(
          (in_) =>
            O.fold_(
              CK.last(in_),
              () => producer,
              (last) =>
                CH.zipRight_(
                  CH.fromEffect(HO.offer(handoff, new HO.Emit(CK.single(last)))),
                  producer
                )
            ),
          (cause) => CH.fromEffect(HO.offer(handoff, new HO.Halt(cause))),
          (_) => CH.fromEffect(HO.offer(handoff, new HO.End(new SER.UpstreamEnd())))
        )

        const consumer = (
          state: DebounceState<E, A>
        ): CH.Channel<
          CL.HasClock & R,
          unknown,
          unknown,
          unknown,
          E,
          CK.Chunk<A>,
          any
        > =>
          CH.unwrap(
            (() => {
              switch (state._typeId) {
                case NotStartedTypeId:
                  return T.map_(HO.take(handoff), (sig) => {
                    switch (sig._typeId) {
                      case HO.EmitTypeId:
                        return CH.unwrap(enqueue(sig.els))
                      case HO.HaltTypeId:
                        return CH.failCause(sig.error)
                      case HO.EndTypeId:
                        return CH.unit
                    }
                  })
                case CurrentTypeId:
                  return T.map_(F.join(state.fiber), (sig) => {
                    switch (sig._typeId) {
                      case HO.EmitTypeId:
                        return CH.unwrap(enqueue(sig.els))
                      case HO.HaltTypeId:
                        return CH.failCause(sig.error)
                      case HO.EndTypeId:
                        return CH.unit
                    }
                  })

                case PreviousTypeId:
                  return T.raceWith_(
                    F.join(state.fiber),
                    HO.take(handoff),
                    (ex, current) => {
                      if (Ex.succeeded(ex)) {
                        return T.succeed(
                          CH.zipRight_(
                            CH.write(ex.value),
                            consumer(new Current(current))
                          )
                        )
                      } else {
                        return T.as_(F.interrupt(current), CH.failCause(ex.cause))
                      }
                    },
                    (ex, previous) => {
                      if (Ex.succeeded(ex)) {
                        const sig = ex.value

                        switch (sig._typeId) {
                          case HO.EmitTypeId:
                            return T.zipRight_(F.interrupt(previous), enqueue(sig.els))
                          case HO.HaltTypeId:
                            return T.as_(F.interrupt(previous), CH.failCause(sig.error))
                          case HO.EndTypeId:
                            return T.map_(F.join(previous), (_) =>
                              CH.zipRight_(CH.write(_), CH.unit)
                            )
                        }
                      } else {
                        return T.as_(F.interrupt(previous), CH.failCause(ex.cause))
                      }
                    }
                  )
              }
            })()
          )

        return CrossRight.crossRight_(
          Managed.managed(M.fork(CH.runManaged(self.channel[">>>"](producer)))),
          new C.Stream(consumer(new NotStarted()))
        )
      })
    )
  )
}

/**
 * Delays the emission of values by holding new values for a set duration. If no new values
 * arrive during that time the value is emitted, however if a new value is received during the holding period
 * the previous value is discarded and the process is repeated with the new value.
 *
 * This operator is useful if you have a stream of "bursty" events which eventually settle down and you
 * only need the final event of the burst.
 *
 * @example A search engine may only want to initiate a search after a user has paused typing
 *          so as to not prematurely recommend results.
 *
 * @ets_data_first debounce_
 */
export function debounce(d: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => debounce_(self, d)
}
