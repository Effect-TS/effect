// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import type * as CL from "../../../../Clock/index.js"
import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import * as F from "../../../../Fiber/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as O from "../../../../Option/index.js"
import * as Ref from "../../../../Ref/index.js"
import * as SC from "../../../../Schedule/index.js"
import * as CH from "../../Channel/index.js"
import type * as SK from "../../Sink/index.js"
import * as C from "../core.js"
import * as HO from "../Handoff.js"
import * as SER from "../SinkEndReason.js"
import * as Chain from "./chain.js"
import * as CrossRight from "./crossRight.js"
import * as FromEffect from "./fromEffect.js"
import * as Managed from "./managed.js"

/**
 * Aggregates elements using the provided sink until it completes, or until the
 * delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Elements
 * will be aggregated by the sink until the downstream fiber pulls the aggregated value,
 * or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays between
 * pulls.
 */
export function aggregateAsyncWithinEither_<
  R,
  R1,
  R2,
  E extends E1,
  E1,
  E2,
  A extends A1,
  A1,
  B,
  C
>(
  self: C.Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
): C.Stream<R & R1 & R2 & CL.HasClock, E2, E.Either<C, B>> {
  type HandoffSignal = HO.HandoffSignal<C, E1, A>
  type SinkEndReason = SER.SinkEndReason<C>

  const deps = T.tuple(
    HO.make<HandoffSignal>(),
    Ref.makeRef<SinkEndReason>(new SER.SinkEnd()),
    Ref.makeRef(CK.empty<A1>()),
    SC.driver(schedule)
  )

  return Chain.chain_(
    FromEffect.fromEffect(deps),
    ({ tuple: [handoff, sinkEndReason, sinkLeftovers, scheduleDriver] }) => {
      const handoffProducer: CH.Channel<
        unknown,
        E1,
        CK.Chunk<A>,
        unknown,
        never,
        never,
        any
      > = CH.readWithCause(
        (_in: CK.Chunk<A>) =>
          CH.zipRight_(
            CH.fromEffect(HO.offer(handoff, new HO.Emit(_in))),
            handoffProducer
          ),
        (cause: CS.Cause<E1>) => CH.fromEffect(HO.offer(handoff, new HO.Halt(cause))),
        (_: any) => CH.fromEffect(HO.offer(handoff, new HO.End(new SER.UpstreamEnd())))
      )

      const handoffConsumer: CH.Channel<
        unknown,
        unknown,
        unknown,
        unknown,
        E1,
        CK.Chunk<A1>,
        void
      > = CH.unwrap(
        T.chain_(Ref.getAndSet_(sinkLeftovers, CK.empty<A1>()), (leftovers) => {
          if (CK.isEmpty(leftovers)) {
            return T.succeed(CH.zipRight_(CH.write(leftovers), handoffConsumer))
          } else {
            return T.map_(HO.take(handoff), (_) => {
              switch (_._typeId) {
                case HO.EmitTypeId:
                  return CH.zipRight_(CH.write(_.els), handoffConsumer)
                case HO.HaltTypeId:
                  return CH.failCause(_.error)
                case HO.EndTypeId:
                  return CH.fromEffect(Ref.set_(sinkEndReason, _.reason))
              }
            })
          }
        })
      )

      const scheduledAggregator = (
        lastB: O.Option<B>
      ): CH.Channel<
        R1 & R2 & CL.HasClock,
        unknown,
        unknown,
        unknown,
        E2,
        CK.Chunk<E.Either<C, B>>,
        any
      > => {
        const timeout = T.foldCauseM_(
          scheduleDriver.next(lastB),
          (_) =>
            E.fold_(
              CS.failureOrCause(_),
              (_) => HO.offer(handoff, new HO.End(new SER.ScheduleTimeout())),
              (cause) => HO.offer(handoff, new HO.Halt(cause))
            ),
          (c) => HO.offer(handoff, new HO.End(new SER.ScheduleEnd(c)))
        )

        return pipe(
          CH.managed_(T.forkManaged(timeout), (fiber) => {
            return CH.chain_(
              CH.doneCollect(handoffConsumer[">>>"](sink.channel)),
              ({ tuple: [leftovers, b] }) => {
                return CH.zipRight_(
                  CH.fromEffect(
                    T.zipRight_(
                      F.interrupt(fiber),
                      Ref.set_(sinkLeftovers, CK.flatten(leftovers))
                    )
                  ),
                  CH.unwrap(
                    Ref.modify_(sinkEndReason, (reason) => {
                      switch (reason._typeId) {
                        case SER.ScheduleEndTypeId:
                          return Tp.tuple(
                            CH.as_(
                              CH.write(CK.from([E.right(b), E.left(reason.c)])),
                              O.some(b)
                            ),
                            new SER.SinkEnd()
                          )
                        case SER.ScheduleTimeoutTypeId:
                          return Tp.tuple(
                            CH.as_(CH.write(CK.single(E.right(b))), O.some(b)),
                            new SER.SinkEnd()
                          )
                        case SER.SinkEndTypeId:
                          return Tp.tuple(
                            CH.as_(CH.write(CK.single(E.right(b))), O.some(b)),
                            new SER.SinkEnd()
                          )
                        case SER.UpstreamEndTypeId:
                          return Tp.tuple(
                            CH.as_(CH.write(CK.single(E.right(b))), O.none),
                            new SER.UpstreamEnd()
                          )
                      }
                    })
                  )
                )
              }
            )
          }),
          CH.chain((_) => {
            if (O.isNone(_)) {
              return CH.unit
            } else {
              return scheduledAggregator(_)
            }
          })
        )
      }

      return CrossRight.crossRight_(
        Managed.managed(
          pipe(self.channel[">>>"](handoffProducer), CH.runManaged, M.fork)
        ),
        new C.Stream(scheduledAggregator(O.none))
      )
    }
  )
}

/**
 * Aggregates elements using the provided sink until it completes, or until the
 * delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Elements
 * will be aggregated by the sink until the downstream fiber pulls the aggregated value,
 * or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays between
 * pulls.
 *
 * @ets_data_first aggregateAsyncWithinEither_
 */
export function aggregateAsyncWithinEither<R1, R2, E1, E2, A1, B, C>(
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
) {
  return <R, E extends E1, A extends A1>(self: C.Stream<R, E, A>) =>
    aggregateAsyncWithinEither_(self, sink, schedule)
}
