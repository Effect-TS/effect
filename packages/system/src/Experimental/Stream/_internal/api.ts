import * as CS from "../../../Cause"
import * as CL from "../../../Clock"
import * as A from "../../../Collections/Immutable/Chunk"
import * as HashMap from "../../../Collections/Immutable/HashMap"
import * as L from "../../../Collections/Immutable/List"
import * as Tp from "../../../Collections/Immutable/Tuple"
import * as T from "../../../Effect"
import * as E from "../../../Either"
import * as Ex from "../../../Exit"
import * as F from "../../../Fiber"
import type { Predicate, Refinement } from "../../../Function"
import { identity, pipe } from "../../../Function"
import type { Has, Tag } from "../../../Has"
import * as H from "../../../Hub"
import * as M from "../../../Managed"
import * as O from "../../../Option"
import * as P from "../../../Promise"
import * as Q from "../../../Queue"
import * as Ref from "../../../Ref"
import * as SC from "../../../Schedule"
import * as SM from "../../../Semaphore"
import { AtomicBoolean } from "../../../Support/AtomicBoolean"
import { AtomicNumber } from "../../../Support/AtomicNumber"
import { AtomicReference } from "../../../Support/AtomicReference"
import { RingBuffer } from "../../../Support/RingBuffer"
import * as CH from "../Channel"
import * as MD from "../Channel/_internal/mergeHelpers"
import * as Pull from "../Pull"
import * as SK from "../Sink"
import * as Take from "../Take"
import * as C from "./core"
import { Stream } from "./core"
import * as HO from "./Handoff"
import * as SER from "./SinkEndReason"
import * as Z from "./zip"

/**
 * Submerges the error case of an `Either` into the `Stream`.
 */
export function absolve<R, E, E2, A>(
  xs: Stream<R, E, E.Either<E2, A>>
): Stream<R, E | E2, A> {
  return C.mapEffect_(xs, (_) => T.fromEither(() => _))
}

/**
 * Aggregates elements of this stream using the provided sink for as long
 * as the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Whenever
 * the downstream fiber is busy processing elements, the upstream fiber will feed elements
 * into the sink until it signals completion.
 *
 * Any sink can be used here, but see `Sink.foldWeightedM` and `Sink.foldUntilM` for
 * sinks that cover the common usecases.
 */
export function aggregateAsync_<R, R1, E extends E1, E1, E2, A extends A1, A1, B>(
  self: Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>
): Stream<R & R1 & Has<CL.Clock>, E2, B> {
  return aggregateAsyncWithin_(self, sink, SC.forever)
}

/**
 * Aggregates elements of this stream using the provided sink for as long
 * as the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Whenever
 * the downstream fiber is busy processing elements, the upstream fiber will feed elements
 * into the sink until it signals completion.
 *
 * Any sink can be used here, but see `Sink.foldWeightedM` and `Sink.foldUntilM` for
 * sinks that cover the common usecases.
 *
 * @ets_data_first aggregateAsync_
 */
export function aggregateAsync<R1, E1, E2, A1, B>(
  sink: SK.Sink<R1, E1, A1, E2, A1, B>
) {
  return <R, E extends E1, A extends A1>(self: Stream<R, E, A>) =>
    aggregateAsync_(self, sink)
}

/**
 * Like `aggregateAsyncWithinEither`, but only returns the `Right` results.
 */
export function aggregateAsyncWithin_<
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
  self: Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
): Stream<R & R1 & R2 & Has<CL.Clock>, E2, B> {
  return collect_(
    aggregateAsyncWithinEither_(self, sink, schedule),
    E.fold(
      () => O.none,
      (v) => O.some(v)
    )
  )
}

/**
 * Like `aggregateAsyncWithinEither`, but only returns the `Right` results.
 *
 * @ets_data_first aggregateAsyncWithin_
 */
export function aggregateAsyncWithin<R1, R2, E1, E2, A1, B, C>(
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
) {
  return <R, E extends E1, A extends A1>(self: Stream<R, E, A>) =>
    aggregateAsyncWithin_(self, sink, schedule)
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
  self: Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
): Stream<R & R1 & R2 & Has<CL.Clock>, E2, E.Either<C, B>> {
  type HandoffSignal = HO.HandoffSignal<C, E1, A>
  type SinkEndReason = SER.SinkEndReason<C>

  const deps = T.tuple(
    HO.make<HandoffSignal>(),
    Ref.makeRef<SinkEndReason>(new SER.SinkEnd()),
    Ref.makeRef(A.empty<A1>()),
    SC.driver(schedule)
  )

  return C.chain_(
    fromEffect(deps),
    ({ tuple: [handoff, sinkEndReason, sinkLeftovers, scheduleDriver] }) => {
      const handoffProducer: CH.Channel<
        unknown,
        E1,
        A.Chunk<A>,
        unknown,
        never,
        never,
        any
      > = CH.readWithCause(
        (_in: A.Chunk<A>) =>
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
        A.Chunk<A1>,
        void
      > = CH.unwrap(
        T.chain_(Ref.getAndSet_(sinkLeftovers, A.empty<A1>()), (leftovers) => {
          if (A.isEmpty(leftovers)) {
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
        A.Chunk<E.Either<C, B>>,
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
                      Ref.set_(sinkLeftovers, A.flatten(leftovers))
                    )
                  ),
                  CH.unwrap(
                    Ref.modify_(sinkEndReason, (reason) => {
                      switch (reason._typeId) {
                        case SER.ScheduleEndTypeId:
                          return Tp.tuple(
                            CH.as_(
                              CH.write(A.from([E.right(b), E.left(reason.c)])),
                              O.some(b)
                            ),
                            new SER.SinkEnd()
                          )
                        case SER.ScheduleTimeoutTypeId:
                          return Tp.tuple(
                            CH.as_(CH.write(A.single(E.right(b))), O.some(b)),
                            new SER.SinkEnd()
                          )
                        case SER.SinkEndTypeId:
                          return Tp.tuple(
                            CH.as_(CH.write(A.single(E.right(b))), O.some(b)),
                            new SER.SinkEnd()
                          )
                        case SER.UpstreamEndTypeId:
                          return Tp.tuple(
                            CH.as_(CH.write(A.single(E.right(b))), O.none),
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

      return Z.zipRight_(
        C.managed(pipe(self.channel[">>>"](handoffProducer), CH.runManaged, M.fork)),
        new Stream(scheduledAggregator(O.none))
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
  return <R, E extends E1, A extends A1>(self: Stream<R, E, A>) =>
    aggregateAsyncWithinEither_(self, sink, schedule)
}

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as_<R, E, A, A2>(self: Stream<R, E, A>, a2: A2): Stream<R, E, A2> {
  return C.map_(self, (_) => a2)
}

/**
 * Maps the success values of this stream to the specified constant value.
 *
 * @ets_data_first as_
 */
export function as<A2>(a2: A2) {
  return <R, E, A>(self: Stream<R, E, A>) => as_(self, a2)
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, E1, A, A1>(
  self: Stream<R, E, A>,
  f: (e: E) => E1,
  g: (a: A) => A1
): Stream<R, E1, A1> {
  return C.map_(mapError_(self, f), g)
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @ets_data_first bimap_
 */
export function bimap<E, E1, A, A1>(f: (e: E) => E1, g: (a: A) => A1) {
  return <R>(self: Stream<R, E, A>) => bimap_(self, f, g)
}

// TODO: broadcast -> Missing fromQueueWithShutdown

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic_<R, E, A>(
  self: Stream<R, E, A>,
  maximumLag: number
): M.Managed<R, never, C.Stream<unknown, E, A>> {
  return M.map_(broadcastedQueuesDynamic_(self, maximumLag), (_) =>
    pipe(C.managed(_), C.chain(fromQueue()), flattenTake)
  )
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 *
 * @ets_data_first broadcastDynamic_
 */
export function broadcastDynamic(maximumLag: number) {
  return <R, E, A>(self: Stream<R, E, A>) => broadcastDynamic_(self, maximumLag)
}

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues_<R, E, A>(
  self: Stream<R, E, A>,
  n: number,
  maximumLag: number
): M.Managed<R, never, A.Chunk<H.HubDequeue<unknown, never, Take.Take<E, A>>>> {
  return pipe(
    M.do,
    M.bind("hub", () => T.toManaged(H.makeBounded<Take.Take<E, A>>(maximumLag))),
    M.bind("queues", ({ hub }) => M.collectAll(A.fill(n, () => H.subscribe(hub)))),
    M.tap(({ hub }) => M.fork(runIntoHubManaged_(self, hub))),
    M.map(({ queues }) => queues)
  )
}

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 *
 * @ets_data_first broadcastedQueues_
 */
export function broadcastedQueues(n: number, maximumLag: number) {
  return <R, E, A>(self: Stream<R, E, A>) => broadcastedQueues_(self, n, maximumLag)
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic_<R, E, A>(
  self: Stream<R, E, A>,
  maximumLag: number
): M.Managed<
  R,
  never,
  M.Managed<unknown, never, H.HubDequeue<unknown, never, Take.Take<E, A>>>
> {
  return M.map_(toHub_(self, maximumLag), (_) => H.subscribe(_))
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 *
 * @ets_data_first broadcastedQueuesDynamic_
 */
export function broadcastedQueuesDynamic(maximumLag: number) {
  return <R, E, A>(self: Stream<R, E, A>) => broadcastedQueuesDynamic_(self, maximumLag)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 */
export function buffer_<R, E, A>(
  self: Stream<R, E, A>,
  capacity: number
): Stream<R, E, A> {
  const queue = toQueueOfElements_(self, capacity)

  return new Stream(
    CH.managed_(queue, (queue) => {
      const process: CH.Channel<
        unknown,
        unknown,
        unknown,
        unknown,
        E,
        A.Chunk<A>,
        void
      > = CH.chain_(
        CH.fromEffect(Q.take(queue)),
        Ex.fold(
          (_) =>
            O.fold_(
              CS.flipCauseOption(_),
              () => CH.end(undefined),
              (_) => CH.failCause(_)
            ),
          (value) => CH.zipRight_(CH.write(A.single(value)), process)
        )
      )

      return process
    })
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @ets_data_first buffer_
 */
export function buffer(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>) => buffer_(self, capacity)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 */
export function bufferChunks_<R, E, A>(
  self: Stream<R, E, A>,
  capacity: number
): Stream<R, E, A> {
  const queue = toQueue_(self, capacity)

  return new Stream(
    CH.managed_(queue, (queue) => {
      const process: CH.Channel<
        unknown,
        unknown,
        unknown,
        unknown,
        E,
        A.Chunk<A>,
        void
      > = CH.chain_(CH.fromEffect(Q.take(queue)), (take) =>
        Take.fold_(
          take,
          CH.end(undefined),
          (error) => CH.failCause(error),
          (value) => CH.zipRight_(CH.write(value), process)
        )
      )

      return process
    })
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @ets_data_first bufferChunks_
 */
export function bufferChunks(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>) => bufferChunks_(self, capacity)
}

export function bufferSignal<R1, E1, A1>(
  managed: M.Managed<
    unknown,
    never,
    Q.Queue<Tp.Tuple<[Take.Take<E1, A1>, P.Promise<never, void>]>>
  >,
  channel: CH.Channel<R1, unknown, unknown, unknown, E1, A.Chunk<A1>, any>
): CH.Channel<R1, unknown, unknown, unknown, E1, A.Chunk<A1>, void> {
  const producer = (
    queue: Q.Queue<Tp.Tuple<[Take.Take<E1, A1>, P.Promise<never, void>]>>,
    ref: Ref.Ref<P.Promise<never, void>>
  ): CH.Channel<R1, E1, A.Chunk<A1>, unknown, never, never, any> => {
    const terminate = (
      take: Take.Take<E1, A1>
    ): CH.Channel<R1, E1, A.Chunk<A1>, unknown, never, never, any> =>
      CH.fromEffect(
        pipe(
          T.do,
          T.bind("latch", () => ref.get),
          T.tap(({ latch }) => P.await(latch)),
          T.bind("p", () => P.make<never, void>()),
          T.tap(({ p }) => Q.offer_(queue, Tp.tuple(take, p))),
          T.tap(({ p }) => ref.set(p)),
          T.tap(({ p }) => P.await(p)),
          T.asUnit
        )
      )

    return CH.readWith(
      (_in) =>
        CH.zipRight_(
          CH.fromEffect(
            pipe(
              T.do,
              T.bind("p", () => P.make<never, void>()),
              T.bind("added", ({ p }) => Q.offer_(queue, Tp.tuple(Take.chunk(_in), p))),
              T.tap(({ added, p }) => T.when_(ref.set(p), () => added)),
              T.asUnit
            )
          ),
          producer(queue, ref)
        ),
      (err) => terminate(Take.fail(err)),
      (_) => terminate(Take.end)
    )
  }

  const consumer = (
    queue: Q.Queue<Tp.Tuple<[Take.Take<E1, A1>, P.Promise<never, void>]>>
  ): CH.Channel<R1, unknown, unknown, unknown, E1, A.Chunk<A1>, void> => {
    const process: CH.Channel<
      unknown,
      unknown,
      unknown,
      unknown,
      E1,
      A.Chunk<A1>,
      void
    > = CH.chain_(CH.fromEffect(Q.take(queue)), ({ tuple: [take, promise] }) =>
      CH.zipRight_(
        CH.fromEffect(P.succeed_(promise, undefined)),
        Take.fold_(
          take,
          CH.end(undefined),
          (error) => CH.failCause(error),
          (value) => CH.zipRight_(CH.write(value), process)
        )
      )
    )

    return process
  }

  return CH.managed_(
    pipe(
      M.do,
      M.bind("queue", () => managed),
      M.bind("start", () => T.toManaged(P.make<never, void>())),
      M.tap(({ start }) => T.toManaged(P.succeed_(start, undefined))),
      M.bind("ref", ({ start }) => Ref.makeManagedRef(start)),
      M.tap(({ queue, ref }) =>
        M.fork(CH.runManaged(channel[">>>"](producer(queue, ref))))
      ),
      M.map(({ queue }) => queue)
    ),
    (queue) => consumer(queue)
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a dropping queue.
 */
export function bufferChunksDropping_<R, E, A>(
  self: Stream<R, E, A>,
  capacity: number
): Stream<R, E, A> {
  const queue = T.toManagedRelease_(
    Q.makeDropping<Tp.Tuple<[Take.Take<E, A>, P.Promise<never, void>]>>(capacity),
    Q.shutdown
  )

  return new Stream(bufferSignal<R, E, A>(queue, self.channel))
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a dropping queue.
 *
 * @ets_data_first bufferChunksDropping_
 */
export function bufferChunksDropping(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>) => bufferChunksDropping_(self, capacity)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a sliding queue.
 */
export function bufferChunksSliding_<R, E, A>(
  self: Stream<R, E, A>,
  capacity: number
): Stream<R, E, A> {
  const queue = T.toManagedRelease_(
    Q.makeSliding<Tp.Tuple<[Take.Take<E, A>, P.Promise<never, void>]>>(capacity),
    Q.shutdown
  )

  return new Stream(bufferSignal<R, E, A>(queue, self.channel))
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a sliding queue.
 *
 * @ets_data_first bufferChunksSliding_
 */
export function bufferChunksSliding(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>) => bufferChunksSliding_(self, capacity)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * elements into an unbounded queue.
 */
export function bufferUnbounded<R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> {
  const queue = toQueueUnbounded(self)

  return new Stream(
    CH.managed_(queue, (queue) => {
      const process: CH.Channel<
        unknown,
        unknown,
        unknown,
        unknown,
        E,
        A.Chunk<A>,
        void
      > = CH.chain_(
        CH.fromEffect(Q.take(queue)),
        Take.fold(
          CH.end(undefined),
          (error) => CH.failCause(error),
          (value) => CH.zipRight_(CH.write(value), process)
        )
      )

      return process
    })
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  f: (e: E) => Stream<R1, E1, A1>
): Stream<R & R1, E1, A | A1> {
  return catchAllCause_(self, (_) =>
    E.fold_(CS.failureOrCause(_), f, (_) => failCause(_))
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<R1, E, E1, A1>(f: (e: E) => Stream<R1, E1, A1>) {
  return <R, A>(self: Stream<R, E, A>) => catchAll_(self, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  f: (cause: CS.Cause<E>) => Stream<R1, E1, A1>
): Stream<R & R1, E1, A | A1> {
  const channel: CH.Channel<
    R & R1,
    unknown,
    unknown,
    unknown,
    E1,
    A.Chunk<A | A1>,
    unknown
  > = CH.catchAllCause_(self.channel, (_) => f(_).channel)

  return new Stream(channel)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 *
 * @ets_data_first catchAllCause_
 */
export function catchAllCause<R1, E, E1, A1>(
  f: (cause: CS.Cause<E>) => Stream<R1, E1, A1>
) {
  return <R, A>(self: Stream<R, E, A>) => catchAllCause_(self, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  pf: (e: E) => O.Option<Stream<R1, E1, A1>>
): Stream<R & R1, E1, A | A1> {
  return catchAll_(self, (e) =>
    O.fold_(
      pf(e),
      () => fail(e),
      (_) => _
    )
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 *
 * @ets_data_first catchSome_
 */
export function catchSome<R1, E, E1, A1>(pf: (e: E) => O.Option<Stream<R1, E1, A1>>) {
  return <R, A>(self: Stream<R, E, A>) => catchSome_(self, pf)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  pf: (e: CS.Cause<E>) => O.Option<Stream<R1, E1, A1>>
): Stream<R & R1, E | E1, A | A1> {
  return catchAllCause_(
    self,
    (e): C.Stream<R1, E | E1, A1> =>
      O.fold_(
        pf(e),
        () => failCause(e),
        (_) => _
      )
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 *
 * @ets_data_first catchSomeCause_
 */
export function catchSomeCause<R1, E, E1, A1>(
  pf: (e: CS.Cause<E>) => O.Option<Stream<R1, E1, A1>>
) {
  return <R, A>(self: Stream<R, E, A>) => catchSomeCause_(self, pf)
}

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using natural equality to determine whether two
 * elements are equal.
 */
export function changes<R, E, A>(self: Stream<R, E, A>) {
  return changesWith_(self, (_) => _ === _)
}

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine
 * whether two elements are equal.
 */
export function changesWith_<R, E, A>(
  self: Stream<R, E, A>,
  f: (a1: A, a2: A) => boolean
): Stream<R, E, A> {
  const writer = (
    last: O.Option<A>
  ): CH.Channel<R, E, A.Chunk<A>, unknown, E, A.Chunk<A>, void> =>
    CH.readWithCause(
      (chunk) => {
        const {
          tuple: [newLast, newChunk]
        } = A.reduce_(
          chunk,
          Tp.tuple(last, A.empty<A>()),
          ({ tuple: [op, os] }, o1) => {
            if (O.isSome(op)) {
              if (f(op.value, o1)) {
                return Tp.tuple(O.some(o1), os)
              }
            }

            return Tp.tuple(O.some(o1), A.append_(os, o1))
          }
        )

        return CH.zipRight_(CH.write(newChunk), writer(newLast))
      },
      (cause) => CH.failCause(cause),
      (_) => CH.unit
    )

  return new Stream(self.channel[">>>"](writer(O.none)))
}

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine
 * whether two elements are equal.
 *
 * @ets_data_first changesWith_
 */
export function changesWith<A>(f: (a1: A, a2: A) => boolean) {
  return <R, E>(self: Stream<R, E, A>) => changesWith_(self, f)
}

class Rechunker<A> {
  private builder = A.builder<A>()
  private pos = 0

  constructor(readonly n: number) {}

  write(elem: A) {
    this.builder.append(elem)
    this.pos += 1

    if (this.pos === this.n) {
      const result = this.builder.build()

      this.builder = A.builder()
      this.pos = 0

      return result
    }

    return null
  }

  emitOfNotEmpty() {
    if (this.pos !== 0) {
      return CH.write(this.builder.build())
    } else {
      return CH.unit
    }
  }
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN_<R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A> {
  return C.unwrap(
    T.succeedWith(() => {
      const rechunker = new Rechunker<A>(n)
      const process: CH.Channel<
        R,
        E,
        A.Chunk<A>,
        unknown,
        E,
        A.Chunk<A>,
        void
      > = CH.readWithCause(
        (chunk) => {
          const chunkSize = A.size(chunk)

          if (chunkSize > 0) {
            let chunks = L.empty<A.Chunk<A>>()
            let result: A.Chunk<A> | null = null
            let i = 0

            while (i < chunkSize) {
              while (i < chunkSize && result === null) {
                result = rechunker.write(A.unsafeGet_(chunk, i))
                i += 1
              }

              if (result !== null) {
                chunks = L.prepend_(chunks, result)
                result = null
              }
            }

            return CH.zipRight_(CH.writeAll(...L.toArray(L.reverse(chunks))), process)
          }

          return process
        },
        (cause) => CH.zipRight_(rechunker.emitOfNotEmpty(), CH.failCause(cause)),
        (_) => rechunker.emitOfNotEmpty()
      )

      return new Stream(self.channel[">>>"](process))
    })
  )
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 *
 * @ets_data_first chunkN_
 */
export function chunkN(n: number) {
  return <R, E, A>(self: Stream<R, E, A>) => chunkN_(self, n)
}

/**
 * Exposes the underlying chunks of the stream as a stream of chunks of elements
 */
export function chunks<R, E, A>(self: Stream<R, E, A>): Stream<R, E, A.Chunk<A>> {
  return mapChunks_(self, A.single)
}

/**
 * Performs a filter and map in a single step.
 */
export function collect_<R, E, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => O.Option<B>
): C.Stream<R, E, B> {
  return mapChunks_(self, A.filterMap(f))
}

/**
 * Performs a filter and map in a single step.
 *
 * @ets_data_first collect_
 */
export function collect<A, B>(f: (a: A) => O.Option<B>) {
  return <R, E>(self: Stream<R, E, A>) => collect_(self, f)
}

/**
 * Filters any `Right` values.
 */
export function collectLeft<R, E, L1, A>(
  self: Stream<R, E, E.Either<L1, A>>
): Stream<R, E, L1> {
  return collect_(
    self,
    E.fold(
      (a) => O.some(a),
      (_) => O.none
    )
  )
}

/**
 * Filters any `Left` values.
 */
export function collectRight<R, E, A, R1>(
  self: Stream<R, E, E.Either<A, R1>>
): Stream<R, E, R1> {
  return collect_(
    self,
    E.fold(
      (_) => O.none,
      (a) => O.some(a)
    )
  )
}

/**
 * Filters any `None` values.
 */
export function collectSome<R, E, A>(self: Stream<R, E, O.Option<A>>): Stream<R, E, A> {
  return collect_(self, (a) => a)
}

/**
 * Filters any `Exit.Failure` values.
 */
export function collectSuccess<R, E, A, L1>(self: Stream<R, E, Ex.Exit<L1, A>>) {
  return collect_(
    self,
    Ex.fold(
      (_) => O.none,
      (a) => O.some(a)
    )
  )
}

/**
 * Performs an effectful filter and map in a single step.
 */
export function collectEffect_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  pf: (a: A) => O.Option<T.Effect<R1, E1, A1>>
): Stream<R & R1, E | E1, A1> {
  return C.loopOnPartialChunksElements_(self, (a, emit) =>
    O.fold_(
      pf(a),
      () => T.unit,
      (_) => T.asUnit(T.chain_(_, emit))
    )
  )
}

/**
 * Performs an effectful filter and map in a single step.
 *
 * @ets_data_first collectEffect_
 */
export function collectEffect<R1, E1, A, A1>(
  pf: (a: A) => O.Option<T.Effect<R1, E1, A1>>
) {
  return <R, E>(self: Stream<R, E, A>) => collectEffect_(self, pf)
}

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhile_<R, E, A, A1>(
  self: Stream<R, E, A>,
  pf: (a: A) => O.Option<A1>
): Stream<R, E, A1> {
  const loop: CH.Channel<R, E, A.Chunk<A>, unknown, E, A.Chunk<A1>, any> = CH.readWith(
    (_in) => {
      const mapped = A.collectWhile_(_in, pf)

      if (A.size(mapped) === A.size(_in)) {
        return CH.zipRight_(CH.write(mapped), loop)
      } else {
        return CH.write(mapped)
      }
    },
    CH.fail,
    CH.succeed
  )

  return new Stream(self.channel[">>>"](loop))
}

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 *
 * @ets_data_first collectWhile_
 */
export function collectWhile<A, A1>(pf: (a: A) => O.Option<A1>) {
  return <R, E>(self: Stream<R, E, A>) => collectWhile_(self, pf)
}

/**
 * Terminates the stream when encountering the first `Right`.
 */
export function collectWhileLeft<R, E, A1, L1>(
  self: Stream<R, E, E.Either<L1, A1>>
): Stream<R, E, L1> {
  return collectWhile_(
    self,
    E.fold(
      (l) => O.some(l),
      (_) => O.none
    )
  )
}

/**
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhileEffect_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  pf: (a: A) => O.Option<T.Effect<R1, E1, A1>>
): Stream<R & R1, E | E1, A1> {
  return C.loopOnPartialChunks_(self, (chunk, emit) => {
    const pfSome = (a: A) =>
      O.fold_(
        pf(a),
        () => T.succeed(false),
        (_) => T.as_(T.chain_(_, emit), true)
      )

    const loop = (chunk: A.Chunk<A>): T.Effect<R1, E1, boolean> => {
      if (A.isEmpty(chunk)) {
        return T.succeed(true)
      } else {
        return T.chain_(pfSome(A.unsafeHead(chunk)), (cont) => {
          if (cont) {
            return loop(A.unsafeTail(chunk))
          } else {
            return T.succeed(false)
          }
        })
      }
    }

    return loop(chunk)
  })
}

/**
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 *
 * @ets_data_first collectWhileEffect_
 */
export function collectWhileEffect<R1, E1, A, A1>(
  pf: (a: A) => O.Option<T.Effect<R1, E1, A1>>
) {
  return <R, E>(self: Stream<R, E, A>) => collectWhileEffect_(self, pf)
}

/**
 * Terminates the stream when encountering the first `None`.
 */
export function collectWhileSome<R, E, A1>(
  self: Stream<R, E, O.Option<A1>>
): Stream<R, E, A1> {
  return collectWhile_(self, identity)
}

/**
 * Terminates the stream when encountering the first `Left`.
 */
export function collectWhileRight<R, E, A1, L1>(
  self: Stream<R, E, E.Either<L1, A1>>
): Stream<R, E, A1> {
  return collectWhile_(
    self,
    E.fold(
      () => O.none,
      (r) => O.some(r)
    )
  )
}

/**
 * Terminates the stream when encountering the first `Exit.Failure`.
 */
export function collectWhileSuccess<R, E, A1, L1>(
  self: Stream<R, E, Ex.Exit<L1, A1>>
): Stream<R, E, A1> {
  return collectWhile_(
    self,
    Ex.fold(
      () => O.none,
      (r) => O.some(r)
    )
  )
}

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `Stream#combineChunks` for a more efficient implementation.
 */
export function combine_<R, R1, E, E1, A, A1, A2, S>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  s: S,
  f: (
    s: S,
    e1: T.Effect<R, O.Option<E>, A>,
    e2: T.Effect<R1, O.Option<E1>, A1>
  ) => T.Effect<R1, never, Ex.Exit<O.Option<E1>, Tp.Tuple<[A2, S]>>>
): Stream<R & R1, E1, A2> {
  const producer = <Err, Elem>(
    handoff: HO.Handoff<Ex.Exit<O.Option<Err>, Elem>>,
    latch: HO.Handoff<void>
  ): CH.Channel<R1, Err, Elem, unknown, never, never, any> =>
    CH.zipRight_(
      CH.fromEffect(HO.take(latch)),
      CH.readWithCause(
        (value: Elem) =>
          CH.zipRight_(
            CH.fromEffect(HO.offer(handoff, Ex.succeed(value))),
            producer(handoff, latch)
          ),
        (cause) =>
          CH.fromEffect(HO.offer(handoff, Ex.failCause(CS.map_(cause, O.some)))),
        (_) =>
          CH.zipRight_(
            CH.fromEffect(HO.offer(handoff, Ex.fail(O.none))),
            producer(handoff, latch)
          )
      )
    )

  return new Stream(
    CH.managed_(
      pipe(
        M.do,
        M.bind("left", () => T.toManaged(HO.make<Ex.Exit<O.Option<E>, A>>())),
        M.bind("right", () => T.toManaged(HO.make<Ex.Exit<O.Option<E1>, A1>>())),
        M.bind("latchL", () => T.toManaged(HO.make<void>())),
        M.bind("latchR", () => T.toManaged(HO.make<void>())),
        M.tap(({ latchL, left }) =>
          pipe(
            CH.concatMap_(self.channel, (_) => CH.writeChunk(_))[">>>"](
              producer(left, latchL)
            ),
            CH.runManaged,
            M.fork
          )
        ),
        M.tap(({ latchR, right }) =>
          pipe(
            CH.concatMap_(that.channel, (_) => CH.writeChunk(_))[">>>"](
              producer(right, latchR)
            ),
            CH.runManaged,
            M.fork
          )
        ),
        M.map(({ latchL, latchR, left, right }) =>
          Tp.tuple(left, right, latchL, latchR)
        )
      ),
      ({ tuple: [left, right, latchL, latchR] }) => {
        const pullLeft = T.zipRight_(
          HO.offer(latchL, undefined),
          T.chain_(HO.take(left), T.done)
        )
        const pullRight = T.zipRight_(
          HO.offer(latchR, undefined),
          T.chain_(HO.take(right), T.done)
        )

        return unfoldEffect(s, (s) =>
          T.chain_(f(s, pullLeft, pullRight), (_) => T.unoption(T.done(_)))
        ).channel
      }
    )
  )
}

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `Stream#combineChunks` for a more efficient implementation.
 *
 * @ets_data_first combine_
 */
export function combine<R, R1, E, E1, A, A1, A2, S>(
  that: Stream<R1, E1, A1>,
  s: S,
  f: (
    s: S,
    e1: T.Effect<R, O.Option<E>, A>,
    e2: T.Effect<R1, O.Option<E1>, A1>
  ) => T.Effect<R1, never, Ex.Exit<O.Option<E1>, Tp.Tuple<[A2, S]>>>
) {
  return (self: Stream<R, E, A>) => combine_(self, that, s, f)
}

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 */
export function concat_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A | A1> {
  return new Stream<R & R1, E | E1, A | A1>(CH.zipRight_(self.channel, that.channel))
}

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 *
 * @ets_data_first concat_
 */
export function concat<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => concat_(self, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function cross_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, Tp.Tuple<[A, A1]>> {
  return new Stream(
    CH.concatMap_(self.channel, (a) =>
      CH.mapOut_(that.channel, (b) =>
        A.chain_(a, (a) => A.map_(b, (b) => Tp.tuple(a, b)))
      )
    )
  )
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * @ets_data_first cross_
 */
export function cross<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => cross_(self, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossLeft_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A> {
  return C.map_(cross_(self, that), Tp.get(0))
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * @ets_data_first crossLeft_
 */
export function crossLeft<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => crossLeft_(self, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossRight_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A1> {
  return C.map_(cross_(self, that), Tp.get(1))
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * @ets_data_first crossRight_
 */
export function crossRight<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => crossRight_(self, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossWith<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
) {
  return <C>(f: (a: A, a1: A1) => C): Stream<R & R1, E | E1, C> =>
    C.chain_(self, (l) => C.map_(that, (r) => f(l, r)))
}

/**
 * Switches to the provided stream in case this one is empty.
 */
function defaultIfEmptyStream<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  stream: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A | A1> {
  const writer = (): CH.Channel<
    R1,
    E,
    A.Chunk<A>,
    unknown,
    E | E1,
    A.Chunk<A | A1>,
    any
  > =>
    CH.readWith(
      (in_) =>
        A.isEmpty(in_)
          ? writer()
          : CH.zipRight_(CH.write(in_), CH.identity<E | E1, A.Chunk<A | A1>, any>()),
      (e) => CH.fail(e),
      (_) => stream.channel
    )

  return new Stream(self.channel[">>>"](writer()))
}

/**
 * Produces the specified chunk if this stream is empty.
 */
function defaultIfEmptyChunk<R, E, A, A1>(
  self: Stream<R, E, A>,
  chunk: A.Chunk<A1>
): Stream<R, E, A | A1> {
  return defaultIfEmptyStream(self, new Stream(CH.write(chunk)))
}

/**
 * Produces the specified element if this stream is empty.
 */
function defaultIfEmptyValue<R, E, A, A1>(
  self: Stream<R, E, A>,
  a: A1
): Stream<R, E, A | A1> {
  return defaultIfEmptyChunk(self, A.single(a))
}

export function defaultIfEmpty_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  stream: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A | A1>
export function defaultIfEmpty_<R, E, A, A1>(
  self: Stream<R, E, A>,
  chunk: A.Chunk<A1>
): Stream<R, E, A | A1>
export function defaultIfEmpty_<R, E, A, A1>(
  self: Stream<R, E, A>,
  a: A1
): Stream<R, E, A | A1>
export function defaultIfEmpty_<R, E, A>(
  self: Stream<R, E, A>,
  emptyValue: unknown
): Stream<R, E, unknown> {
  if (A.isChunk(emptyValue)) {
    return defaultIfEmptyChunk(self, emptyValue)
  }

  if (C.isStream(emptyValue)) {
    return defaultIfEmptyStream(self, emptyValue)
  }

  return defaultIfEmptyValue(self, emptyValue)
}

/**
 * @ets_data_first defaultIfEmpty_
 */
export function defaultIfEmpty<R, R1, E, E1, A, A1>(
  stream: Stream<R1, E1, A1>
): (self: Stream<R, E, A>) => C.Stream<R & R1, E | E1, A | A1>
export function defaultIfEmpty<R, E, A, A1>(
  chunk: A.Chunk<A1>
): (self: Stream<R, E, A>) => C.Stream<R, E, A | A1>
export function defaultIfEmpty<R, E, A, A1>(
  a: A1
): (self: Stream<R, E, A>) => C.Stream<R, E, A | A1>
export function defaultIfEmpty<R, E, A>(
  emptyValue: unknown
): (self: Stream<R, E, A>) => C.Stream<R, E, unknown> {
  return (self: Stream<R, E, A>) => defaultIfEmpty_(self, emptyValue)
}

/**
 * More powerful version of `Stream#broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith_<R, E, A>(
  self: Stream<R, E, A>,
  n: number,
  maximumLag: number,
  decide: (a: A) => T.UIO<Predicate<number>>
): M.Managed<R, never, L.List<Q.Dequeue<Ex.Exit<O.Option<E>, A>>>> {
  return M.chain_(
    T.toManaged(P.make<never, (a: A) => T.UIO<Predicate<number>>>()),
    (prom) => {
      return M.chain_(
        distributedWithDynamic_(
          self,
          maximumLag,
          (a: A) => T.chain_(P.await(prom), (_) => _(a)),
          (_) => T.unit
        ),
        (next) =>
          pipe(
            T.collectAll(
              A.map_(A.range(0, n), (id) =>
                T.map_(next, ({ tuple: [key, queue] }) =>
                  Tp.tuple(Tp.tuple(key, id), queue)
                )
              )
            ),
            T.chain((entries) => {
              const {
                tuple: [mappings, queues]
              } = A.reduceRight_(
                entries,
                Tp.tuple(
                  HashMap.make<number, number>(),
                  L.empty<Q.Dequeue<Ex.Exit<O.Option<E>, A>>>()
                ),
                ({ tuple: [mapping, queue] }, { tuple: [mappings, queues] }) =>
                  Tp.tuple(
                    HashMap.set_(mappings, Tp.get_(mapping, 0), Tp.get_(mapping, 1)),
                    L.prepend_(queues, queue)
                  )
              )

              return T.as_(
                P.succeed_(prom, (a: A) =>
                  T.map_(
                    decide(a),
                    (f) => (key: number) => f(HashMap.unsafeGet_(mappings, key))
                  )
                ),
                queues
              )
            }),
            T.toManaged
          )
      )
    }
  )
}

/**
 * More powerful version of `Stream#broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 *
 * @ets_data_first distributedWith_
 */
export function distributedWith<A>(
  n: number,
  maximumLag: number,
  decide: (a: A) => T.UIO<Predicate<number>>
) {
  return <R, E>(self: Stream<R, E, A>) => distributedWith_(self, n, maximumLag, decide)
}

const distributedWithDynamicId = new AtomicNumber(0)

/**
 * More powerful version of `Stream#distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic_<R, E, A, A1>(
  self: Stream<R, E, A>,
  maximumLag: number,
  decide: (a: A) => T.UIO<Predicate<number>>,
  done: (ex: Ex.Exit<O.Option<E>, never>) => T.UIO<A1>
): M.Managed<R, never, T.UIO<Tp.Tuple<[number, Q.Dequeue<Ex.Exit<O.Option<E>, A>>]>>> {
  return pipe(
    M.do,
    M.bind("queuesRef", () =>
      T.toManagedRelease_(
        Ref.makeRef<HashMap.HashMap<number, Q.Queue<Ex.Exit<O.Option<E>, A>>>>(
          HashMap.make()
        ),
        (_) =>
          T.chain_(Ref.get(_), (qs) =>
            T.forEach_(HashMap.values(qs), (_) => Q.shutdown(_))
          )
      )
    ),
    M.bind("add", ({ queuesRef }) => {
      const offer = (a: A) =>
        pipe(
          T.do,
          T.bind("shouldProcess", () => decide(a)),
          T.bind("queues", () => Ref.get(queuesRef)),
          T.tap(({ queues, shouldProcess }) =>
            pipe(
              T.reduce_(queues, L.empty<number>(), (acc, [id, queue]) => {
                if (shouldProcess(id)) {
                  return T.foldCauseM_(
                    Q.offer_(queue, Ex.succeed(a)),
                    (c) =>
                      CS.interrupted(c) ? T.succeed(L.prepend_(acc, id)) : T.halt(c),
                    (_) => T.succeed(acc)
                  )
                } else {
                  return T.succeed(acc)
                }
              }),
              T.chain((ids) =>
                L.isEmpty(ids)
                  ? T.unit
                  : Ref.update_(queuesRef, HashMap.removeMany(ids))
              )
            )
          ),
          T.asUnit
        )

      return pipe(
        M.do,
        M.bind("queuesLock", () => T.toManaged(SM.makeSemaphore(1))),
        M.bind("newQueue", () =>
          T.toManaged(
            Ref.makeRef<T.UIO<Tp.Tuple<[number, Q.Queue<Ex.Exit<O.Option<E>, A>>]>>>(
              pipe(
                T.do,
                T.bind("queue", () =>
                  Q.makeBounded<Ex.Exit<O.Option<E>, A>>(maximumLag)
                ),
                T.bind("id", () =>
                  T.succeedWith(() => distributedWithDynamicId.incrementAndGet())
                ),
                T.tap(({ id, queue }) =>
                  Ref.update_(queuesRef, HashMap.set(id, queue))
                ),
                T.map(({ id, queue }) => Tp.tuple(id, queue))
              )
            )
          )
        ),
        M.let(
          "finalize",
          ({ newQueue, queuesLock }) =>
            (endTake: Ex.Exit<O.Option<E>, never>) =>
              SM.withPermit_(
                pipe(
                  T.do,
                  T.tap(() =>
                    Ref.set_(
                      newQueue,
                      pipe(
                        T.do,
                        T.bind("queue", () =>
                          Q.makeBounded<Ex.Exit<O.Option<E>, A>>(1)
                        ),
                        T.tap(({ queue }) => Q.offer_(queue, endTake)),
                        T.bind("id", () =>
                          T.succeedWith(() =>
                            distributedWithDynamicId.incrementAndGet()
                          )
                        ),
                        T.tap(({ id, queue }) =>
                          Ref.update_(queuesRef, HashMap.set(id, queue))
                        ),
                        T.map(({ id, queue }) => Tp.tuple(id, queue))
                      )
                    )
                  ),
                  T.bind("queues", () => T.map_(Ref.get(queuesRef), HashMap.values)),
                  T.tap(({ queues }) =>
                    T.forEach_(queues, (queue) =>
                      T.catchSomeCause_(Q.offer_(queue, endTake), (c) => {
                        if (CS.interrupted(c)) {
                          return O.some(T.unit)
                        } else {
                          return O.none
                        }
                      })
                    )
                  ),
                  T.tap((_) => done(endTake)),
                  T.asUnit
                ),
                queuesLock
              )
        ),
        M.tap(({ finalize }) =>
          pipe(
            runForEachManaged_(self, offer),
            M.foldCauseM(
              (cause) => T.toManaged(finalize(Ex.halt(CS.map_(cause, O.some)))),
              (_) => T.toManaged(finalize(Ex.fail(O.none)))
            ),
            M.fork
          )
        ),
        M.map(({ newQueue, queuesLock }) =>
          SM.withPermit_(T.flatten(Ref.get(newQueue)), queuesLock)
        )
      )
    }),
    M.map(({ add }) => add)
  )
}

/**
 * More powerful version of `Stream#distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 *
 * @ets_data_first distributedWithDynamic_
 */
export function distributedWithDynamic<E, A, A1>(
  maximumLag: number,
  decide: (a: A) => T.UIO<Predicate<number>>,
  done: (ex: Ex.Exit<O.Option<E>, never>) => T.UIO<A1>
) {
  return <R>(self: Stream<R, E, A>) =>
    distributedWithDynamic_(self, maximumLag, decide, done)
}

/**
 * Converts this stream to a stream that executes its effects but emits no
 * elements. Useful for sequencing effects using streams:
 */
export function drain<R, E, A>(self: Stream<R, E, A>): Stream<R, E, never> {
  return new Stream(CH.drain(self.channel))
}

/**
 * Drains the provided stream in the background for as long as this stream is running.
 * If this stream ends before `other`, `other` will be interrupted. If `other` fails,
 * this stream will fail with that error.
 */
export function drainFork_<R, R1, E, E1, A, Z>(
  self: Stream<R, E, A>,
  other: Stream<R1, E1, Z>
): Stream<R & R1, E | E1, A> {
  return C.chain_(fromEffect(P.make<E1, never>()), (bgDied) =>
    Z.zipRight_(
      C.managed(
        pipe(
          runForEachManaged_(other, (_) => T.unit),
          M.catchAllCause((_) => T.toManaged(P.halt_(bgDied, _))),
          M.fork
        )
      ),
      interruptWhenP_(self, bgDied)
    )
  )
}

/**
 * Drains the provided stream in the background for as long as this stream is running.
 * If this stream ends before `other`, `other` will be interrupted. If `other` fails,
 * this stream will fail with that error.
 *
 * @ets_data_first drainFork_
 */
export function drainFork<R1, E1, A, Z>(other: Stream<R1, E1, Z>) {
  return <R, E>(self: Stream<R, E, A>) => drainFork_(self, other)
}

/**
 * Drops the specified number of elements from this stream.
 */
export function drop_<R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A> {
  const loop = (r: number): CH.Channel<R, E, A.Chunk<A>, unknown, E, A.Chunk<A>, any> =>
    CH.readWith(
      (_in) => {
        const dropped = A.drop_(_in, r)
        const leftover = Math.max(r - A.size(_in), 0)
        const more = A.isEmpty(_in) || leftover > 0

        if (more) {
          return loop(leftover)
        } else {
          return CH.zipRight_(CH.write(dropped), CH.identity<E, A.Chunk<A>, any>())
        }
      },
      (e) => CH.fail(e),
      (_) => CH.unit
    )

  return new Stream(self.channel[">>>"](loop(n)))
}

/**
 * Drops the specified number of elements from this stream.
 *
 * @ets_data_first drop_
 */
export function drop(n: number) {
  return <R, E, A>(self: Stream<R, E, A>) => drop_(self, n)
}

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function dropWhile_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>
): Stream<R, E, A> {
  const loop: CH.Channel<R, E, A.Chunk<A>, unknown, E, A.Chunk<A>, any> = CH.readWith(
    (_in) => {
      const leftover = A.dropWhile_(_in, f)
      const more = A.isEmpty(_in)

      if (more) {
        return loop
      } else {
        return CH.zipRight_(CH.write(leftover), CH.identity<E, A.Chunk<A>, any>())
      }
    },
    (e) => CH.fail(e),
    (_) => CH.unit
  )

  return new Stream(self.channel[">>>"](loop))
}

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 *
 * @ets_data_first dropWhile_
 */
export function dropWhile<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>) => dropWhile_(self, f)
}

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>
): Stream<R, E, A> {
  return drop_(
    dropWhile_(self, (_) => !f(_)),
    1
  )
}

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 *
 * @ets_data_first dropUntil_
 */
export function dropUntil<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>) => dropUntil_(self, f)
}

/**
 * Returns a stream whose failures and successes have been lifted into an
 * `Either`. The resulting stream cannot fail, because the failures have
 * been exposed as part of the `Either` success case.
 *
 * @note the stream will end as soon as the first error occurs.
 */
export function either<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, never, E.Either<E, A>> {
  return catchAll_(C.map_(self, E.right), (e) => C.succeed(E.left(e)))
}

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring_<R, R1, E, A, Z>(
  self: Stream<R, E, A>,
  fin: T.Effect<R1, never, Z>
): Stream<R & R1, E, A> {
  return new Stream(CH.ensuring_(self.channel, fin))
}

/**
 * Executes the provided finalizer after this stream's finalizers run.
 *
 * @ets_data_first ensuring_
 */
export function ensuring<R1, Z>(fin: T.Effect<R1, never, Z>) {
  return <R, E, A>(self: Stream<R, E, A>) => ensuring_(self, fin)
}

// TODO: EnsuringFirst -> Not implemented

/**
 * Filters the elements emitted by this stream using the provided function.
 */
export function filter_<R, E, A, B extends A>(
  self: Stream<R, E, A>,
  f: Refinement<A, B>
): Stream<R, E, B>
export function filter_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>
): Stream<R, E, A>
export function filter_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>
): Stream<R, E, A> {
  return mapChunks_(self, A.filter(f))
}

/**
 * Filters the elements emitted by this stream using the provided function.
 *
 * @ets_data_first filter_
 */
export function filter<A, B extends A>(
  f: Refinement<A, B>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, B>
export function filter<A>(
  f: Predicate<A>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, A>
export function filter<A>(
  f: Predicate<A>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, A> {
  return <R, E>(self: Stream<R, E, A>) => filter_(self, f)
}

/**
 * Finds the first element emitted by this stream that satisfies the provided predicate.
 */
export function find_<R, E, A, B extends A>(
  self: Stream<R, E, A>,
  f: Refinement<A, B>
): Stream<R, E, B>
export function find_<R, E, A>(self: Stream<R, E, A>, f: Predicate<A>): Stream<R, E, A>
export function find_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>
): Stream<R, E, A> {
  const loop: CH.Channel<R, E, A.Chunk<A>, unknown, E, A.Chunk<A>, any> = CH.readWith(
    (in_) =>
      O.fold_(
        A.find_(in_, f),
        () => loop,
        (i) => CH.write(A.single(i))
      ),
    (e) => CH.fail(e),
    (_) => CH.unit
  )

  return new Stream(self.channel[">>>"](loop))
}

/**
 * Finds the first element emitted by this stream that satisfies the provided predicate.
 * @ets_data_first find_
 */
export function find<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>) => find_(self, f)
}

/**
 * Finds the first element emitted by this stream that satisfies the provided effectful predicate.
 */
export function findEffect_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, boolean>
): Stream<R & R1, E | E1, A> {
  const loop: CH.Channel<
    R1,
    E,
    A.Chunk<A>,
    unknown,
    E | E1,
    A.Chunk<A>,
    any
  > = CH.readWith(
    (in_) =>
      CH.unwrap(
        T.map_(
          A.findM_(in_, f),
          O.fold(
            () => loop,
            (i) => CH.write(A.single(i))
          )
        )
      ),
    (e) => CH.fail(e),
    (_) => CH.unit
  )

  return new Stream(self.channel[">>>"](loop))
}

/**
 * Finds the first element emitted by this stream that satisfies the provided effectful predicate.
 * @ets_data_first findEffect_
 */
export function findEffect<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, A>) => findEffect_(self, f)
}

/**
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 */
export function runReduce_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => S
): T.Effect<R, E, S> {
  return M.use_(
    runReduceWhileManaged_(
      self,
      s,
      (_) => true,
      (s, a) => f(s, a)
    ),
    T.succeed
  )
}

/**
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 *
 * @ets_data_first runReduce_
 */
export function runReduce<A, S>(s: S, f: (s: S, a: A) => S) {
  return <R, E>(self: Stream<R, E, A>) => runReduce_(self, s, f)
}

/**
 * Executes an effectful fold over the stream of values.
 */
export function runReduceEffect_<R, R1, E, E1, A, S>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
): T.Effect<R & R1, E | E1, S> {
  return M.use_(
    runReduceWhileManagedEffect_(self, s, (_) => true, f),
    T.succeed
  )
}

/**
 * Executes an effectful fold over the stream of values.
 *
 * @ets_data_first runReduceEffect_
 */
export function runReduceEffect<R1, E1, A, S>(
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
) {
  return <R, E>(self: Stream<R, E, A>) => runReduceEffect_(self, s, f)
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function runReduceManaged_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => S
): M.Managed<R, E, S> {
  return runReduceWhileManaged_(
    self,
    s,
    (_) => true,
    (s, a) => f(s, a)
  )
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 *
 * @ets_data_first runReduceManaged_
 */
export function runReduceManaged<A, S>(s: S, f: (s: S, a: A) => S) {
  return <R, E>(self: Stream<R, E, A>) => runReduceManaged_(self, s, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function runReduceManagedEffect_<R, R1, E, E1, A, S>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
): M.Managed<R & R1, E | E1, S> {
  return runReduceWhileManagedEffect_(self, s, (_) => true, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 *
 * @ets_data_first runReduceManagedEffect_
 */
export function runReduceManagedEffect<R1, E1, A, S>(
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
) {
  return <R, E>(self: Stream<R, E, A>) => runReduceManagedEffect_(self, s, f)
}

/**
 * Reduces the elements in the stream to a value of type `S`.
 * Stops the fold early when the condition is not fulfilled.
 */
export function runReduceWhile_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => S
): T.Effect<R, E, S> {
  return M.use_(
    runReduceWhileManaged_(self, s, cont, (s, a) => f(s, a)),
    T.succeed
  )
}

/**
 * Reduces the elements in the stream to a value of type `S`.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @ets_data_first runReduceWhile_
 */
export function runReduceWhile<A, S>(s: S, cont: Predicate<S>, f: (s: S, a: A) => S) {
  return <R, E>(self: Stream<R, E, A>) => runReduceWhile_(self, s, cont, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Stops the fold early when the condition is not fulfilled.
 */
export function runReduceWhileEffect_<R, R1, E, E1, A, S>(
  self: Stream<R, E, A>,
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
): T.Effect<R & R1, E | E1, S> {
  return M.use_(runReduceWhileManagedEffect_(self, s, cont, f), T.succeed)
}

/**
 * Executes an effectful fold over the stream of values.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @ets_data_first runReduceWhileEffect_
 */
export function runReduceWhileEffect<R1, E1, A, S>(
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
) {
  return <R, E>(self: Stream<R, E, A>) => runReduceWhileEffect_(self, s, cont, f)
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function runReduceWhileManaged_<S, R, E, A>(
  self: Stream<R, E, A>,
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => S
): M.Managed<R, E, S> {
  return runManaged_(self, SK.reduce(s, cont, f))
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @ets_data_first runFoldWhileManaged_
 */
export function runReduceWhileManaged<S, A>(
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => S
) {
  return <R, E>(self: Stream<R, E, A>): M.Managed<R, E, S> =>
    runReduceWhileManaged_(self, s, cont, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function runReduceWhileManagedEffect_<R, R1, E, E1, A, S>(
  self: Stream<R, E, A>,
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
): M.Managed<R & R1, E | E1, S> {
  return runManaged_(self, SK.reduceEffect(s, cont, f))
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function runReduceWhileManagedEffect<R1, E1, A, S>(
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
) {
  return <R, E>(self: Stream<R, E, A>) => runReduceWhileManagedEffect_(self, s, cont, f)
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function forEach_<R, R1, E, E1, A, X>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, X>
): T.Effect<R & R1, E | E1, void> {
  return runForEach_(self, f)
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 *
 * @ets_data_first forEach_
 */
export function forEach<R1, E1, A, X>(f: (a: A) => T.Effect<R1, E1, X>) {
  return <R, E>(self: Stream<R, E, A>) => forEach_(self, f)
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function runForEach_<R, R1, E, E1, A, X>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, X>
): T.Effect<R & R1, E | E1, void> {
  return C.run_(self, SK.forEach(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 *
 * @ets_data_first runForEach_
 */
export function runForEach<R1, E1, A, X>(f: (a: A) => T.Effect<R1, E1, X>) {
  return <R, E>(self: Stream<R, E, A>) => runForEach_(self, f)
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function runForEachChunk_<R, R1, E, E1, A, Z>(
  self: Stream<R, E, A>,
  f: (c: A.Chunk<A>) => T.Effect<R1, E1, Z>
): T.Effect<R & R1, E | E1, void> {
  return C.run_(self, SK.forEachChunk(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 *
 * @ets_data_first runForEachChunk_
 */
export function runForEachChunk<R1, E1, A, Z>(
  f: (c: A.Chunk<A>) => T.Effect<R1, E1, Z>
) {
  return <R, E>(self: Stream<R, E, A>) => runForEachChunk_(self, f)
}

/**
 * Like `Stream#forEachChunk`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function runForEachChunkManaged_<R, R1, E, E1, A, Z>(
  self: Stream<R, E, A>,
  f: (c: A.Chunk<A>) => T.Effect<R1, E1, Z>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(self, SK.forEachChunk(f))
}

/**
 * Like `Stream#forEachChunk`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function runForEachChunkManaged<R1, E1, A, Z>(
  f: (c: A.Chunk<A>) => T.Effect<R1, E1, Z>
) {
  return <R, E>(self: Stream<R, E, A>) => runForEachChunkManaged_(self, f)
}

/**
 * Like `Stream#forEach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function runForEachManaged_<R, R1, E, A, Z>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E, Z>
): M.Managed<R & R1, E, void> {
  return runManaged_(self, SK.forEach(f))
}

/**
 * Like `Stream#forEach`, but returns a `Managed` so the finalization order
 * can be controlled.
 *
 * @ets_data_first runForEachManaged_
 */
export function runForEachManaged<R1, E, A, B>(f: (a: A) => T.Effect<R1, E, B>) {
  return <R>(self: Stream<R, E, A>) => runForEachManaged_(self, f)
}

/**
 * Consumes elements of the stream, passing them to the specified callback,
 * and terminating consumption when the callback returns `false`.
 */
export function runForEachWhile_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, boolean>
): T.Effect<R & R1, E | E1, void> {
  return C.run_(self, SK.forEachWhile(f))
}

/**
 * Consumes elements of the stream, passing them to the specified callback,
 * and terminating consumption when the callback returns `false`.
 *
 * @ets_data_first runForEachWhile_
 */
export function runForEachWhile<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, A>) => runForEachWhile_(self, f)
}

/**
 * Like `Stream#forEachWhile`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function runForEachWhileManaged_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, boolean>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(self, SK.forEachWhile(f))
}

/**
 * Like `Stream#forEachWhile`, but returns a `Managed` so the finalization order
 * can be controlled.
 *
 * @ets_data_first runForEachWhileManaged_
 */
export function runForEachWhileManaged<R1, E1, A>(
  f: (a: A) => T.Effect<R1, E1, boolean>
) {
  return <R, E>(self: Stream<R, E, A>) => runForEachWhileManaged_(self, f)
}

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterEffect_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, boolean>
): Stream<R & R1, E | E1, A> {
  return C.loopOnPartialChunksElements_(self, (a, emit) =>
    T.chain_(f(a), (r) => (r ? emit(a) : T.unit))
  )
}

/**
 * Effectfully filters the elements emitted by this stream.
 *
 * @ets_data_first filterEffect_
 */
export function filterEffect<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, A>) => filterEffect_(self, f)
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export function filterNot_<R, E, A, B extends A>(
  self: Stream<R, E, A>,
  pred: Refinement<A, B>
): Stream<R, E, B>
export function filterNot_<R, E, A>(
  self: Stream<R, E, A>,
  pred: Predicate<A>
): Stream<R, E, A>
export function filterNot_<R, E, A>(
  self: Stream<R, E, A>,
  pred: Predicate<A>
): Stream<R, E, A> {
  return filter_(self, (a) => !pred(a))
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 *
 * @ets_data_first filterNot_
 */
export function filterNot<A, B extends A>(
  pred: Refinement<A, B>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, B>
export function filterNot<A>(
  pred: Predicate<A>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, A>
export function filterNot<A>(
  pred: Predicate<A>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, A> {
  return <R, E>(self: Stream<R, E, A>) => filterNot_(self, pred)
}

/**
 * Emits elements of this stream with a fixed delay in between, regardless of how long it
 * takes to produce a value.
 */
export function fixed_<R, E, A>(
  self: Stream<R, E, A>,
  duration: number
): Stream<R & Has<CL.Clock>, E, A> {
  return schedule_(self, SC.fixed(duration))
}

/**
 * Emits elements of this stream with a fixed delay in between, regardless of how long it
 * takes to produce a value.
 *
 * @ets_data_first fixed_
 */
export function fixed(duration: number) {
  return <R, E, A>(self: Stream<R, E, A>) => fixed_(self, duration)
}

// TODO: chainPar -> Missing Channel's mergeAllWith

// TODO: chainParSwitch -> Not implemented

/**
 * Submerges the chunks carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenChunks<R, E, A>(
  self: Stream<R, E, A.Chunk<A>>
): Stream<R, E, A> {
  return new Stream(CH.mapOut_(self.channel, A.flatten))
}

/**
 * Flattens `Exit` values. `Exit.Failure` values translate to stream failures
 * while `Exit.Success` values translate to stream elements.
 */
export function flattenExit<R, E, E1, A>(
  self: Stream<R, E, Ex.Exit<E1, A>>
): Stream<R, E | E1, A> {
  return C.mapEffect_(self, (a) => T.done(a))
}

/**
 * Unwraps `Exit` values that also signify end-of-stream by failing with `None`.
 *
 * For `Exit<E, A>` values that do not signal end-of-stream, prefer:
 */
export function flattenExitOption<R, E, E1, A>(
  self: Stream<R, E, Ex.Exit<O.Option<E1>, A>>
): Stream<R, E | E1, A> {
  const processChunk = (
    chunk: A.Chunk<Ex.Exit<O.Option<E1>, A>>,
    cont: CH.Channel<
      R,
      E,
      A.Chunk<Ex.Exit<O.Option<E1>, A>>,
      unknown,
      E | E1,
      A.Chunk<A>,
      any
    >
  ): CH.Channel<
    R,
    E,
    A.Chunk<Ex.Exit<O.Option<E1>, A>>,
    unknown,
    E | E1,
    A.Chunk<A>,
    any
  > => {
    const {
      tuple: [toEmit, rest]
    } = A.splitWhere_(chunk, (_) => !Ex.succeeded(_))
    const next = O.fold_(
      A.head(rest),
      () => cont,
      Ex.fold(
        (cause) =>
          O.fold_(
            CS.flipCauseOption(cause),
            () => CH.end<void>(undefined),
            (cause) => CH.failCause(cause)
          ),
        () => CH.end<void>(undefined)
      )
    )

    return CH.zipRight_(
      CH.write(
        A.filterMap_(
          toEmit,
          Ex.fold(
            () => O.none,
            (a) => O.some(a)
          )
        )
      ),
      next
    )
  }

  const process: CH.Channel<
    R,
    E,
    A.Chunk<Ex.Exit<O.Option<E1>, A>>,
    unknown,
    E | E1,
    A.Chunk<A>,
    any
  > = CH.readWithCause(
    (chunk) => processChunk(chunk, process),
    (cause) => CH.failCause(cause),
    (_) => CH.end(undefined)
  )

  return new Stream(self.channel[">>>"](process))
}

/**
 * Submerges the iterables carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenIterables<R, E, A>(
  self: Stream<R, E, Iterable<A>>
): Stream<R, E, A> {
  return flattenChunks(C.map_(self, (a) => A.from(a)))
}

// TODO: flattenPar -> Missing chainPar

// TODO: flattenParUnbounded -> Missing chainPar

/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream by failing with `None`.
 */
export function flattenTake<R, E, E1, A>(
  self: Stream<R, E, Take.Take<E1, A>>
): Stream<R, E | E1, A> {
  return pipe(
    self,
    C.map((_) => _.exit),
    flattenExitOption,
    flattenChunks
  )
}

/**
 * Halts the evaluation of this stream when the provided IO completes. The given IO
 * will be forked as part of the returned stream, and its success will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the IO
 * completes. See `interruptWhen` for this behavior.
 *
 * If the IO completes with a failure, the stream will emit that failure.
 */
export function haltWhen_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  io: T.Effect<R1, E1, any>
): Stream<R1 & R, E | E1, A> {
  const writer = (
    fiber: F.Fiber<E | E1, any>
  ): CH.Channel<R1, E | E1, A.Chunk<A>, unknown, E | E1, A.Chunk<A>, void> =>
    CH.unwrap(
      T.map_(
        fiber.poll,
        O.fold(
          () =>
            CH.readWith(
              (in_) => CH.zipRight_(CH.write(in_), writer(fiber)),
              (err) => CH.fail(err),
              (_) => CH.unit
            ),
          (exit) =>
            Ex.fold_(
              exit,
              (_) => CH.failCause(_),
              (_) =>
                CH.unit as CH.Channel<
                  R1,
                  E | E1,
                  A.Chunk<A>,
                  unknown,
                  E | E1,
                  A.Chunk<A>,
                  void
                >
            )
        )
      )
    )

  return new Stream(
    CH.unwrapManaged(
      M.map_(T.forkManaged(io), (fiber) => self.channel[">>>"](writer(fiber)))
    )
  )
}

/**
 * Halts the evaluation of this stream when the provided IO completes. The given IO
 * will be forked as part of the returned stream, and its success will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the IO
 * completes. See `interruptWhen` for this behavior.
 *
 * If the IO completes with a failure, the stream will emit that failure.
 *
 * @ets_data_first haltWhen_
 */
export function haltWhen<R1, E1>(io: T.Effect<R1, E1, any>) {
  return <R, E, A>(self: Stream<R, E, A>) => haltWhen_(self, io)
}

/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 */
export function halfAfter_<R, E, A>(
  self: Stream<R, E, A>,
  duration: number
): Stream<Has<CL.Clock> & R, E, A> {
  return haltWhen_(self, CL.sleep(duration))
}

/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 *
 * @ets_data_first haltAfter_
 */
export function halfAfter(duration: number) {
  return <R, E, A>(self: Stream<R, E, A>) => halfAfter_(self, duration)
}

/**
 * Halts the evaluation of this stream when the provided promise resolves.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function haltWhenP_<R, E, E1, A>(
  self: Stream<R, E, A>,
  p: P.Promise<E1, any>
): Stream<R, E | E1, A> {
  const writer = (): CH.Channel<
    R,
    E | E1,
    A.Chunk<A>,
    unknown,
    E | E1,
    A.Chunk<A>,
    void
  > =>
    CH.unwrap(
      T.map_(
        P.poll(p),
        O.fold(
          () =>
            CH.readWith(
              (in_) => CH.zipRight_(CH.write(in_), writer()),
              (err) => CH.fail(err),
              (_) => CH.unit
            ),
          (io) =>
            CH.unwrap(
              T.fold_(
                io,
                (_) => CH.fail(_),
                (_) => CH.unit
              )
            )
        )
      )
    )

  return new Stream(self.channel[">>>"](writer()))
}

/**
 * Halts the evaluation of this stream when the provided promise resolves.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 *
 * @ets_data_first haltWhenP_
 */
export function haltWhenP<E1>(p: P.Promise<E1, any>) {
  return <R, E, A>(self: Stream<R, E, A>) => haltWhenP_(self, p)
}

/**
 * Interleaves this stream and the specified stream deterministically by
 * alternating pulling values from this stream and the specified stream.
 * When one stream is exhausted all remaining values in the other stream
 * will be pulled.
 */
export function interleave_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A | A1> {
  return interleaveWith_(self, that, C.forever(C.fromChunk(A.from([true, false]))))
}

/**
 * Interleaves this stream and the specified stream deterministically by
 * alternating pulling values from this stream and the specified stream.
 * When one stream is exhausted all remaining values in the other stream
 * will be pulled.
 *
 * @ets_data_first interleave_
 */
export function interleave<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => interleave_(self, that)
}

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `b` to control which stream to pull from next.
 * `true` indicates to pull from this stream and `false` indicates to pull
 * from the specified stream. Only consumes as many elements as requested by
 * `b`. If either this stream or the specified stream are exhausted further
 * requests for values from that stream will be ignored.
 */
export function interleaveWith_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  b: Stream<R1, E1, boolean>
): Stream<R & R1, E | E1, A | A1> {
  const producer = (
    handoff: HO.Handoff<Take.Take<E | E1, A | A1>>
  ): CH.Channel<R1, E | E1, A | A1, unknown, never, never, void> =>
    CH.readWithCause(
      (value) =>
        CH.zipRight_(
          CH.fromEffect(HO.offer(handoff, Take.single(value))),
          producer(handoff)
        ),
      (cause) => CH.fromEffect(HO.offer(handoff, Take.failCause(cause))),
      (_) => CH.fromEffect(HO.offer(handoff, Take.end))
    )

  return new Stream(
    CH.managed_(
      pipe(
        M.do,
        M.bind("left", () => T.toManaged(HO.make<Take.Take<E | E1, A | A1>>())),
        M.bind("right", () => T.toManaged(HO.make<Take.Take<E | E1, A | A1>>())),
        M.tap(({ left }) =>
          M.fork(
            CH.runManaged(
              CH.concatMap_(self.channel, (_) => CH.writeChunk(_))[">>>"](
                producer(left)
              )
            )
          )
        ),
        M.tap(({ right }) =>
          M.fork(
            CH.runManaged(
              CH.concatMap_(that.channel, (_) => CH.writeChunk(_))[">>>"](
                producer(right)
              )
            )
          )
        ),
        M.map(({ left, right }) => Tp.tuple(left, right))
      ),
      ({ tuple: [left, right] }) => {
        const process = (
          leftDone: boolean,
          rightDone: boolean
        ): CH.Channel<R1, E | E1, boolean, unknown, E | E1, A.Chunk<A | A1>, void> =>
          CH.readWithCause(
            (bool) => {
              if (bool && !leftDone) {
                return CH.chain_(
                  CH.fromEffect(HO.take(left)),
                  Take.fold(
                    rightDone ? CH.unit : process(true, rightDone),
                    (cause) => CH.failCause(cause),
                    (chunk) =>
                      CH.zipRight_(CH.write(chunk), process(leftDone, rightDone))
                  )
                )
              }

              if (!bool && !rightDone) {
                return CH.chain_(
                  CH.fromEffect(HO.take(right)),
                  Take.fold(
                    leftDone ? CH.unit : process(leftDone, true),
                    (cause) => CH.failCause(cause),
                    (chunk) =>
                      CH.zipRight_(CH.write(chunk), process(leftDone, rightDone))
                  )
                )
              }

              return process(leftDone, rightDone)
            },
            (cause) => CH.failCause(cause),
            (_) => CH.unit
          )

        return CH.concatMap_(b.channel, (_) => CH.writeChunk(_))[">>>"](
          process(false, false)
        )
      }
    )
  )
}

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `b` to control which stream to pull from next.
 * `true` indicates to pull from this stream and `false` indicates to pull
 * from the specified stream. Only consumes as many elements as requested by
 * `b`. If either this stream or the specified stream are exhausted further
 * requests for values from that stream will be ignored.
 *
 * @ets_data_first interleaveWith_
 */
export function interleaveWith<R1, E1, A1>(
  that: Stream<R1, E1, A1>,
  b: Stream<R1, E1, boolean>
) {
  return <R, E, A>(self: Stream<R, E, A>) => interleaveWith_(self, that, b)
}

/**
 * Intersperse stream with provided element.
 */
export function intersperse_<R, E, A, A1>(
  self: Stream<R, E, A>,
  middle: A1
): Stream<R, E, A | A1> {
  const writer = (
    isFirst: boolean
  ): CH.Channel<R, E, A.Chunk<A | A1>, unknown, E, A.Chunk<A | A1>, void> =>
    CH.readWith(
      (chunk: A.Chunk<A | A1>) => {
        const builder = A.builder<A | A1>()
        let flagResult = isFirst

        A.forEach_(chunk, (o) => {
          if (flagResult) {
            flagResult = false
            builder.append(o)
          } else {
            builder.append(middle)
            builder.append(o)
          }
        })

        return CH.zipRight_(CH.write(builder.build()), writer(flagResult))
      },
      (err: E) => CH.fail(err),
      (_) => CH.unit
    )

  return new Stream(self.channel[">>>"](writer(true)))
}

/**
 * Intersperse stream with provided element.
 *
 * @ets_data_first intersperse_
 */
export function intersperse<A1>(middle: A1) {
  return <R, E, A>(self: Stream<R, E, A>) => intersperse_(self, middle)
}

/**
 * Intersperse and also add a prefix and a suffix
 */
export function intersperseAffixes_<R, E, A, A1>(
  self: Stream<R, E, A>,
  start: A1,
  middle: A1,
  end: A1
): Stream<R, E, A1 | A> {
  return concat_(
    concat_(C.fromChunk(A.single(start)), intersperse_(self, middle)),
    C.fromChunk(A.single(end))
  )
}

/**
 * Intersperse and also add a prefix and a suffix
 *
 * @ets_data_first intersperseAffixes_
 */
export function intersperseAffixes<A1>(start: A1, middle: A1, end: A1) {
  return <R, E, A>(self: Stream<R, E, A>) =>
    intersperseAffixes_(self, start, middle, end)
}

/**
 * Interrupts the evaluation of this stream when the provided IO completes. The given
 * IO will be forked as part of this stream, and its success will be discarded. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the IO completes with a failure before the stream completes, the returned stream
 * will emit that failure.
 */
export function interruptWhen_<R, R1, E, E1, A, Z>(
  self: Stream<R, E, A>,
  io: T.Effect<R1, E1, Z>
): Stream<R1 & R, E | E1, A> {
  return new Stream(CH.interruptWhen_(self.channel, io))
}

/**
 * Interrupts the evaluation of this stream when the provided IO completes. The given
 * IO will be forked as part of this stream, and its success will be discarded. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the IO completes with a failure before the stream completes, the returned stream
 * will emit that failure.
 *
 * @ets_data_first interruptWhen_
 */
export function interruptWhen<R1, E1, Z>(io: T.Effect<R1, E1, Z>) {
  return <R, E, A>(self: Stream<R, E, A>) => interruptWhen_(self, io)
}

/**
 * Interrupts the evaluation of this stream when the provided promise resolves. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function interruptWhenP_<R, E, A, E1>(
  self: Stream<R, E, A>,
  p: P.Promise<E1, never>
): Stream<R, E | E1, A> {
  return new Stream(CH.interruptWhenP_(self.channel, p))
}

/**
 * Interrupts the evaluation of this stream when the provided promise resolves. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 *
 * @ets_data_first interruptWhenP_
 */
export function interruptWhenP<E1>(p: P.Promise<E1, never>) {
  return <R, E, A>(self: Stream<R, E, A>) => interruptWhenP_(self, p)
}

/**
 * Specialized version of interruptWhen which interrupts the evaluation of this stream
 * after the given duration.
 */
export function interruptAfter_<R, E, A>(
  self: Stream<R, E, A>,
  duration: number
): Stream<Has<CL.Clock> & R, E, A> {
  return interruptWhen_(self, CL.sleep(duration))
}

/**
 * Specialized version of interruptWhen which interrupts the evaluation of this stream
 * after the given duration.
 *
 * @ets_data_first interruptAfter_
 */
export function interruptAfter(duration: number) {
  return <R, E, A>(self: Stream<R, E, A>) => interruptAfter_(self, duration)
}

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending will also be
 * signalled.
 */
export function runInto_<R, R1, E extends E1, E1, A>(
  self: Stream<R, E, A>,
  queue: Q.XQueue<R1, never, never, unknown, Take.Take<E1, A>, any>
): T.Effect<R & R1, E | E1, void> {
  return M.use_(runIntoManaged_(self, queue), (_) => T.unit)
}

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending will also be
 * signalled.
 *
 * @ets_data_first runInto_
 */
export function runInto<R1, E1, A>(
  queue: Q.XQueue<R1, never, never, unknown, Take.Take<E1, A>, any>
) {
  return <R, E extends E1>(self: Stream<R, E, A>) => runInto_(self, queue)
}

/**
 * Publishes elements of this stream to a hub. Stream failure and ending will
 * also be signalled.
 */
export function runIntoHub_<R, R1, E extends E1, E1, A>(
  self: Stream<R, E, A>,
  hub: H.XHub<R1, never, never, unknown, Take.Take<E1, A>, any>
): T.Effect<R & R1, E | E1, void> {
  return runInto_(self, H.toQueue(hub))
}

/**
 * Publishes elements of this stream to a hub. Stream failure and ending will
 * also be signalled.
 *
 * @ets_data_first runIntoHub_
 */
export function runIntoHub<R1, E1, A>(
  hub: H.XHub<R1, never, never, unknown, Take.Take<E1, A>, any>
) {
  return <R, E extends E1>(self: Stream<R, E, A>) => runIntoHub_(self, hub)
}

/**
 * Like `Stream#runIntoHub`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoHubManaged_<R, R1, E extends E1, E1, A, Z>(
  self: Stream<R, E, A>,
  hub: H.XHub<R1, never, never, unknown, Take.Take<E1, A>, Z>
): M.Managed<R & R1, E | E1, void> {
  return runIntoManaged_(self, H.toQueue(hub))
}

/**
 * Like `Stream#runIntoHub`, but provides the result as a `Managed` to allow for scope
 * composition.
 *
 * @ets_data_first runIntoHubManaged_
 */
export function runIntoHubManaged<R1, E1, A, Z>(
  hub: H.XHub<R1, never, never, unknown, Take.Take<E1, A>, Z>
) {
  return <R, E extends E1>(self: Stream<R, E, A>) => runIntoHubManaged_(self, hub)
}

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoManaged_<R, R1, E extends E1, E1, A, Z>(
  self: Stream<R, E, A>,
  queue: Q.XQueue<R1, never, never, unknown, Take.Take<E1, A>, Z>
): M.Managed<R & R1, E | E1, void> {
  const writer: CH.Channel<
    R,
    E,
    A.Chunk<A>,
    unknown,
    E,
    Take.Take<E | E1, A>,
    any
  > = CH.readWithCause(
    (in_) => CH.zipRight_(CH.write(Take.chunk(in_)), writer),
    (cause) => CH.write(Take.halt(cause)),
    (_) => CH.write(Take.end)
  )

  return pipe(
    self.channel[">>>"](writer),
    CH.mapOutEffect((_) => Q.offer_(queue, _)),
    CH.drain,
    CH.runManaged,
    M.asUnit
  )
}

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 *
 * @ets_data_first runIntoManaged_
 */
export function runIntoManaged<R1, E1, A, Z>(
  queue: Q.XQueue<R1, never, never, unknown, Take.Take<E1, A>, Z>
) {
  return <R, E extends E1>(self: Stream<R, E, A>) => runIntoManaged_(self, queue)
}

/*
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoElementsManaged_<R, R1, E, A>(
  self: Stream<R, E, A>,
  queue: Q.XQueue<R1, never, never, unknown, Ex.Exit<O.Option<E>, A>, any>
): M.Managed<R & R1, E, void> {
  const writer = (): CH.Channel<
    R1,
    E,
    A.Chunk<A>,
    unknown,
    never,
    Ex.Exit<O.Option<E>, A>,
    any
  > =>
    CH.readWith(
      (in_) =>
        CH.zipRight_(
          A.reduce_(
            in_,
            CH.unit as CH.Channel<
              R1,
              unknown,
              unknown,
              unknown,
              never,
              Ex.Exit<O.Option<E>, A>,
              any
            >,
            (channel, a) => CH.zipRight_(channel, CH.write(Ex.succeed(a)))
          ),
          writer()
        ),
      (err) => CH.write(Ex.fail(O.some(err))),
      (_) => CH.write(Ex.fail(O.none))
    )

  return pipe(
    self.channel[">>>"](writer()),
    CH.mapOutEffect((_) => Q.offer_(queue, _)),
    CH.drain,
    CH.runManaged,
    M.asUnit
  )
}

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 *
 * @ets_data_first runIntoElementsManaged_
 */
export function runIntoElementsManaged<R1, E, A>(
  queue: Q.XQueue<R1, never, never, unknown, Ex.Exit<O.Option<E>, A>, any>
) {
  return <R>(self: Stream<R, E, A>) => runIntoElementsManaged_(self, queue)
}

// TODO: lock -> requires `Executor` support in Effect?

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export function mapAccum_<R, E, A, A1, S>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => Tp.Tuple<[S, A1]>
): Stream<R, E, A1> {
  const accumulator = (
    currS: S
  ): CH.Channel<unknown, E, A.Chunk<A>, unknown, E, A.Chunk<A1>, void> =>
    CH.readWith(
      (in_) => {
        const {
          tuple: [nextS, a2s]
        } = A.mapAccum_(in_, currS, f)

        return CH.zipRight_(CH.write(a2s), accumulator(nextS))
      },
      (err) => CH.fail(err),
      (_) => CH.unit
    )

  return new Stream(self.channel[">>>"](accumulator(s)))
}

/**
 * Statefully maps over the elements of this stream to produce new elements.
 *
 * @ets_data_first mapAccum_
 */
export function mapAccum<A, A1, S>(s: S, f: (s: S, a: A) => Tp.Tuple<[S, A1]>) {
  return <R, E>(self: Stream<R, E, A>) => mapAccum_(self, s, f)
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export function mapAccumEffect_<R, R1, E, E1, A, A1, S>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, Tp.Tuple<[S, A1]>>
): Stream<R & R1, E | E1, A1> {
  const accumulator = (
    s: S
  ): CH.Channel<R1, E, A.Chunk<A>, unknown, E | E1, A.Chunk<A1>, void> =>
    CH.readWith(
      (in_) =>
        CH.unwrap(
          T.suspend(() => {
            const outputChunk = A.builder<A1>()
            const emit: (a1: A1) => T.UIO<void> = (a) =>
              T.asUnit(
                T.succeedWith(() => {
                  outputChunk.append(a)
                })
              )

            return pipe(
              in_,
              T.reduce(s, (s1, a) =>
                T.chain_(f(s1, a), (sa) => T.as_(emit(Tp.get_(sa, 1)), Tp.get_(sa, 0)))
              ),
              T.fold(
                (failure) => {
                  const partialResult = outputChunk.build()

                  if (!A.isEmpty(partialResult)) {
                    return CH.zipRight_(CH.write(partialResult), CH.fail(failure))
                  } else {
                    return CH.fail(failure)
                  }
                },
                (_) => CH.zipRight_(CH.write(outputChunk.build()), accumulator(_))
              )
            )
          })
        ),
      (_) => CH.fail(_),
      (_) => CH.unit
    )

  return new Stream(self.channel[">>>"](accumulator(s)))
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 *
 * @ets_data_first mapAccumEffect_
 */
export function mapAccumEffect<R1, E1, A, A1, S>(
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, Tp.Tuple<[S, A1]>>
) {
  return <R, E>(self: Stream<R, E, A>) => mapAccumEffect_(self, s, f)
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks_<R, E, A, A1>(
  self: Stream<R, E, A>,
  f: (chunk: A.Chunk<A>) => A.Chunk<A1>
): Stream<R, E, A1> {
  return new Stream(CH.mapOut_(self.channel, f))
}

/**
 * Transforms the chunks emitted by this stream.
 *
 * @ets_data_first mapChunks_
 */
export function mapChunks<A, A1>(f: (chunk: A.Chunk<A>) => A.Chunk<A1>) {
  return <R, E>(self: Stream<R, E, A>) => mapChunks_(self, f)
}

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksEffect_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  f: (c: A.Chunk<A>) => T.Effect<R1, E1, A.Chunk<A1>>
): Stream<R & R1, E | E1, A1> {
  return new Stream(CH.mapOutEffect_(self.channel, f))
}

/**
 * Effectfully transforms the chunks emitted by this stream.
 *
 * @ets_data_first mapChunksEffect_
 */
export function mapChunksEffect<R1, E1, A, A1>(
  f: (c: A.Chunk<A>) => T.Effect<R1, E1, A.Chunk<A1>>
) {
  return <R, E>(self: Stream<R, E, A>) => mapChunksEffect_(self, f)
}

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export function mapConcat_<R, E, A, A1>(
  self: Stream<R, E, A>,
  f: (a: A) => Iterable<A1>
): Stream<R, E, A1> {
  return mapConcatChunk_(self, (a) => A.from(f(a)))
}

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 *
 * @ets_data_first mapConcat_
 */
export function mapConcat<A, A1>(f: (a: A) => Iterable<A1>) {
  return <R, E>(self: Stream<R, E, A>) => mapConcat_(self, f)
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export function mapConcatChunk_<R, E, A, A1>(
  self: Stream<R, E, A>,
  f: (a: A) => A.Chunk<A1>
): Stream<R, E, A1> {
  return mapChunks_(self, A.chain(f))
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 *
 * @ets_data_first mapConcatChunk_
 */
export function mapConcatChunk<A, A1>(f: (a: A) => A.Chunk<A1>) {
  return <R, E>(self: Stream<R, E, A>) => mapConcatChunk_(self, f)
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkEffect_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, A.Chunk<A1>>
): Stream<R & R1, E | E1, A1> {
  return mapConcatChunk_(C.mapEffect_(self, f), identity)
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 *
 * @ets_data_first mapConcatChunkEffect_
 */
export function mapConcatChunkEffect<R1, E1, A, A1>(
  f: (a: A) => T.Effect<R1, E1, A.Chunk<A1>>
) {
  return <R, E>(self: Stream<R, E, A>) => mapConcatChunkEffect_(self, f)
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatEffect_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, Iterable<A1>>
): Stream<R & R1, E | E1, A1> {
  return mapConcatChunk_(
    C.mapEffect_(self, (a) => T.map_(f(a), A.from)),
    identity
  )
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 *
 * @ets_data_first mapConcatEffect_
 */
export function mapConcatEffect<R1, E1, A, A1>(
  f: (a: A) => T.Effect<R1, E1, Iterable<A1>>
) {
  return <R, E>(self: Stream<R, E, A>) => mapConcatEffect_(self, f)
}

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError_<R, E, E1, A>(
  self: Stream<R, E, A>,
  f: (e: E) => E1
): Stream<R, E1, A> {
  return new Stream(CH.mapError_(self.channel, f))
}

/**
 * Transforms the errors emitted by this stream using `f`.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <R, A>(self: Stream<R, E, A>) => mapError_(self, f)
}

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export function mapErrorCause_<R, E, E1, A>(
  self: Stream<R, E, A>,
  f: (c: CS.Cause<E>) => CS.Cause<E1>
): Stream<R, E1, A> {
  return new Stream(CH.mapErrorCause_(self.channel, f))
}

/**
 * Transforms the full causes of failures emitted by this stream.
 *
 * @ets_data_first mapErrorCause_
 */
export function mapErrorCause<E, E1>(f: (c: CS.Cause<E>) => CS.Cause<E1>) {
  return <R, A>(self: Stream<R, E, A>) => mapErrorCause_(self, f)
}

// TODO: mapEffPar -> Missing Channel mapOutEffPar

// TODO: mapEffParUnordered -> missing chainPar

// TODO: mapEffPartitioned -> groupBy

export type TerminationStrategy = "Left" | "Right" | "Both" | "Either"

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if no termination
 * strategy is specified.
 */
export function merge_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  strategy: TerminationStrategy = "Both"
): Stream<R1 & R, E | E1, A | A1> {
  return mergeWith(self, that, identity, identity, strategy)
}

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if no termination
 * strategy is specified.
 *
 * @ets_data_first merge_
 */
export function merge<R1, E1, A1>(
  that: Stream<R1, E1, A1>,
  strategy: TerminationStrategy = "Both"
) {
  return <R, E, A>(self: Stream<R, E, A>) => merge_(self, that, strategy)
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when either stream terminates.
 */
export function mergeTerminateEither_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R1 & R, E | E1, A | A1> {
  return merge_(self, that, "Either")
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when either stream terminates.
 *
 * @ets_data_first mergeTerminateEither_
 */
export function mergeTerminateEither<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => mergeTerminateEither_(self, that)
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when this stream terminates.
 */
export function mergeTerminateLeft_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R1 & R, E | E1, A | A1> {
  return merge_(self, that, "Left")
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when this stream terminates.
 *
 * @ets_data_first mergeTerminateLeft_
 */
export function mergeTerminateLeft<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => mergeTerminateLeft_(self, that)
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when the specified stream terminates.
 */
export function mergeTerminateRight_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R1 & R, E | E1, A | A1> {
  return merge_(self, that, "Right")
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when the specified stream terminates.
 * @ets_data_first mergeTerminateRight_
 */
export function mergeTerminateRight<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => mergeTerminateRight_(self, that)
}

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 */
export function mergeEither_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R1 & R, E | E1, E.Either<A, A1>> {
  return mergeWith(self, that, E.left, E.right)
}

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 *
 * @ets_data_first mergeEither_
 */
export function mergeEither<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => mergeEither_(self, that)
}

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 */
export function mergeWith<R, R1, E, E1, A, A1, A2, A3>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  l: (a: A) => A2,
  r: (a: A1) => A3,
  strategy: TerminationStrategy = "Both"
): Stream<R1 & R, E | E1, A2 | A3> {
  const handler =
    (terminate: boolean) =>
    (
      exit: Ex.Exit<E | E1, any>
    ): MD.MergeDecision<R1, E | E1, unknown, E | E1, any> => {
      if (terminate || !Ex.succeeded(exit)) {
        return MD.done(T.done(exit))
      } else {
        return MD.await_(T.done)
      }
    }

  return new Stream<R1 & R, E | E1, A2 | A3>(
    CH.mergeWith_(
      C.map_(self, l).channel,
      C.map_(that, r).channel,
      handler(strategy === "Either" || strategy === "Left"),
      handler(strategy === "Either" || strategy === "Right")
    )
  )
}

/**
 * Runs the specified effect if this stream fails, providing the error to the effect if it exists.
 *
 * Note: Unlike `Effect.onError`, there is no guarantee that the provided effect will not be interrupted.
 */
export function onError_<R, R1, E, A>(
  self: Stream<R, E, A>,
  cleanup: (c: CS.Cause<E>) => T.Effect<R1, never, any>
): Stream<R & R1, E, A> {
  return catchAllCause_(self, (cause) =>
    fromEffect(T.zipRight_(cleanup(cause), T.halt(cause)))
  )
}

/**
 * Runs the specified effect if this stream fails, providing the error to the effect if it exists.
 *
 * Note: Unlike `Effect.onError`, there is no guarantee that the provided effect will not be interrupted.
 *
 * @ets_data_first onError_
 */
export function onError<R1, E>(cleanup: (c: CS.Cause<E>) => T.Effect<R1, never, any>) {
  return <R, A>(self: Stream<R, E, A>) => onError_(self, cleanup)
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElse_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A | A1> {
  return new Stream<R & R1, E | E1, A | A1>(CH.orElse_(self.channel, that.channel))
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 *
 * @ets_data_first orElse_
 */
export function orElse<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => orElse_(self, that)
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElseEither_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, E.Either<A, A1>> {
  return orElse_(C.map_(self, E.left), C.map_(that, E.right))
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 *
 * @ets_data_first orElseEither_
 */
export function orElseEither<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => orElseEither_(self, that)
}

/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElseFail_<R, E, E1, A>(
  self: Stream<R, E, A>,
  e1: E1
): Stream<R, E | E1, A> {
  return orElse_(self, C.fail(e1))
}

/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 *
 * @ets_data_first orElseFail_
 */
export function orElseFail<E1>(e1: E1) {
  return <R, E, A>(self: Stream<R, E, A>) => orElseFail_(self, e1)
}

/**
 * Switches to the provided stream in case this one fails with the `None` value.
 *
 * See also `Stream#catchAll`.
 */
export function orElseOptional_<R, R1, E, E1, A, A1>(
  self: Stream<R, O.Option<E>, A>,
  that: Stream<R1, O.Option<E1>, A1>
): Stream<R & R1, O.Option<E | E1>, A | A1> {
  return catchAll_(
    self,
    O.fold(
      (): Stream<R & R1, O.Option<E | E1>, A | A1> => that,
      (e) => C.fail(O.some(e))
    )
  )
}

/**
 * Switches to the provided stream in case this one fails with the `None` value.
 *
 * See also `Stream#catchAll`.
 *
 * @ets_data_first orElseOptional_
 */
export function orElseOptional<R1, E1, A1>(that: Stream<R1, O.Option<E1>, A1>) {
  return <R, E, A>(self: Stream<R, O.Option<E>, A>) => orElseOptional_(self, that)
}

/**
 * Succeeds with the specified value if this one fails with a typed error.
 */
export function orElseSucceed_<R, E, A, A1>(
  self: Stream<R, E, A>,
  a1: A1
): Stream<R, E, A | A1> {
  return orElse_(self, C.succeed(a1))
}

/**
 * Succeeds with the specified value if this one fails with a typed error.
 *
 * @ets_data_first orElseSucceed_
 */
export function orElseSucceed<A1>(a1: A1) {
  return <R, E, A>(self: Stream<R, E, A>) => orElseSucceed_(self, a1)
}

// TODO: partition -> Missing paritionEither

// TODO: partitionEither -> Missing fromQueueWithShutdown -> missing ensuringFirst

const SignalTypeId = Symbol()

const EmitTypeId = Symbol()
export class Emit<A> {
  readonly _signalTypeId: typeof SignalTypeId = SignalTypeId
  readonly _typeId: typeof EmitTypeId = EmitTypeId

  constructor(readonly els: A.Chunk<A>) {}
}

const HaltTypeId = Symbol()
export class Halt<E> {
  readonly _signalTypeId: typeof SignalTypeId = SignalTypeId
  readonly _typeId: typeof HaltTypeId = HaltTypeId

  constructor(readonly cause: CS.Cause<E>) {}
}

const EndTypeId = Symbol()
export class End {
  readonly _signalTypeId: typeof SignalTypeId = SignalTypeId
  readonly _typeId: typeof EndTypeId = EndTypeId
}

type Signal<A, E> = Emit<A> | Halt<E> | End

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a managed resource. Like all `Managed` values, the provided
 * stream is valid only within the scope of `Managed`.
 */
export function peel_<R, R1, E extends E1, E1, A extends A1, A1, Z>(
  self: Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E1, A1, Z>
): M.Managed<R & R1, E | E1, Tp.Tuple<[Z, C.Stream<R & R1, E | E1, A | A1>]>> {
  return pipe(
    M.do,
    M.bind("p", () => T.toManaged(P.make<E | E1, Z>())),
    M.bind("handoff", () => T.toManaged(HO.make<Signal<A | A1, E | E1>>())),
    M.map(({ handoff, p }) => {
      const consumer = SK.foldSink_(
        SK.exposeLeftover(sink),
        (e) => SK.zipRight_(SK.fromEffect(P.fail_(p, e)), SK.fail(e)),
        ({ tuple: [z1, leftovers] }) => {
          const loop: CH.Channel<
            unknown,
            E,
            A.Chunk<A | A1>,
            unknown,
            E | E1,
            A.Chunk<A | A1>,
            void
          > = CH.readWithCause(
            (in_) =>
              CH.zipRight_(CH.fromEffect(HO.offer(handoff, new Emit(in_))), loop),
            (e) =>
              CH.zipRight_(
                CH.fromEffect(HO.offer(handoff, new Halt(e))),
                CH.failCause(e)
              ),
            (_) => CH.zipRight_(CH.fromEffect(HO.offer(handoff, new End())), CH.unit)
          )

          return new SK.Sink(
            CH.zipRight_(
              CH.zipRight_(
                CH.fromEffect(P.succeed_(p, z1)),
                CH.fromEffect(HO.offer(handoff, new Emit(leftovers)))
              ),
              loop
            )
          )
        }
      )

      const producer: CH.Channel<
        unknown,
        unknown,
        unknown,
        unknown,
        E | E1,
        A.Chunk<A | A1>,
        void
      > = CH.unwrap(
        T.map_(HO.take(handoff), (sig) => {
          switch (sig._typeId) {
            case EmitTypeId:
              return CH.zipRight_(CH.write(sig.els), producer)
            case HaltTypeId:
              return CH.failCause(sig.cause)
            default:
              return CH.unit
          }
        })
      )

      return pipe(
        M.fork(runManaged_(self, consumer)),
        M.chain((_) => T.toManaged(P.await(p))),
        M.map((z) => Tp.tuple(z, new Stream(producer)))
      )
    }),
    M.flatten
  )
}

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a managed resource. Like all `Managed` values, the provided
 * stream is valid only within the scope of `Managed`.
 *
 * @ets_data_first peel_
 */
export function peel<R1, E extends E1, E1, A extends A1, A1, Z>(
  sink: SK.Sink<R1, E1, A1, E1, A1, Z>
) {
  return <R>(self: Stream<R, E, A>) => peel_(self, sink)
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll_<R, E, A>(
  self: Stream<R, E, A>,
  r: R
): Stream<unknown, E, A> {
  return new Stream(CH.provideAll_(self.channel, r))
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @ets_data_first provideAll_
 */
export function provideAll<R>(r: R) {
  return <E, A>(self: Stream<R, E, A>) => provideAll_(self, r)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith_<R, E, E1, A>(
  self: Stream<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => any
): Stream<R, E | E1, A> {
  return new Stream(
    CH.catchAll_(self.channel, (e) =>
      O.fold_(
        pf(e),
        () => CH.failCause(CS.die(f(e))),
        (e1) => CH.fail(e1)
      )
    )
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @ets_data_first refineOrDieWith_
 */
export function refineOrDieWith<E, E1>(pf: (e: E) => O.Option<E1>, f: (e: E) => any) {
  return <R, A>(self: Stream<R, E, A>) => refineOrDieWith_(self, pf, f)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, E, E1, A>(
  self: Stream<R, E, A>,
  pf: (e: E) => O.Option<E1>
): Stream<R, E | E1, A> {
  return refineOrDieWith_(self, pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 *
 * @ets_data_first refineOrDie_
 */
export function refineOrDie<E, E1>(pf: (e: E) => O.Option<E1>) {
  return <R, A>(self: Stream<R, E, A>) => refineOrDie_(self, pf)
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule.
 */
export function repeatSchedule_<R, R1, E, A, B>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>
): Stream<R & R1 & Has<CL.Clock>, E, A> {
  return collect_(
    repeatEither_(self, schedule),
    E.fold(
      (_) => O.none,
      (a) => O.some(a)
    )
  )
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule.
 *
 * @ets_data_first repeat_
 */
export function repeatSchedule<R1, B>(schedule: SC.Schedule<R1, any, B>) {
  return <R, E, A>(self: Stream<R, E, A>) => repeatSchedule_(self, schedule)
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition.
 */
export function repeatEither_<R, R1, E, A, B>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>
): Stream<R & R1 & CL.HasClock, E, E.Either<B, A>> {
  return repeatWith_(self, schedule, E.right, E.left)
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition.
 *
 * @ets_data_first repeatEither_
 */
export function repeatEither<R1, B>(schedule: SC.Schedule<R1, any, B>) {
  return <R, E, A>(self: Stream<R, E, A>) => repeatEither_(self, schedule)
}

/**
 * Repeats each element of the stream using the provided schedule. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElements_<R, R1, E, A, B>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>
): Stream<R & R1 & CL.HasClock, E, A> {
  return collect_(
    repeatElementsEither_(self, schedule),
    E.fold(
      () => O.none,
      (a) => O.some(a)
    )
  )
}

/**
 * Repeats each element of the stream using the provided schedule. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 *
 * @ets_data_first repeatElements_
 */
export function repeatElements<R1, B>(schedule: SC.Schedule<R1, any, B>) {
  return <R, E, A>(self: Stream<R, E, A>) => repeatElements_(self, schedule)
}

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElementsEither_<R, R1, E, A, B>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>
): Stream<R & R1 & CL.HasClock, E, E.Either<B, A>> {
  return repeatElementsWith_(self, schedule, E.right, E.left)
}

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 *
 * @ets_data_first repeatElementsEither_
 */
export function repeatElementsEither<R1, B>(schedule: SC.Schedule<R1, any, B>) {
  return <R, E, A>(self: Stream<R, E, A>) => repeatElementsEither_(self, schedule)
}

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 *
 * This function accepts two conversion functions, which allow the output of this stream and the
 * output of the provided schedule to be unified into a single type. For example, `Either` or
 * similar data type.
 */
export function repeatElementsWith_<R, R1, E, A, B, C1, C2>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
): Stream<R & R1 & Has<CL.Clock>, E, C1 | C2> {
  return new Stream(
    self.channel[">>>"](
      CH.unwrap(
        pipe(
          T.do,
          T.bind("driver", () => SC.driver(schedule)),
          T.map(({ driver }) => {
            const feed = (
              in_: A.Chunk<A>
            ): CH.Channel<
              R1 & CL.HasClock,
              E,
              A.Chunk<A>,
              unknown,
              E,
              A.Chunk<C1 | C2>,
              void
            > =>
              O.fold_(
                A.head(in_),
                () => loop(),
                (a) => CH.zipRight_(CH.write(A.single(f(a))), step(A.drop_(in_, 1), a))
              )

            const step = (
              in_: A.Chunk<A>,
              a: A
            ): CH.Channel<
              R1 & CL.HasClock,
              E,
              A.Chunk<A>,
              unknown,
              E,
              A.Chunk<C1 | C2>,
              void
            > => {
              const advance = T.as_(
                driver.next(a),
                CH.zipRight_(CH.write(A.single(f(a))), step(in_, a))
              )
              const reset: T.Effect<
                R1 & CL.HasClock,
                never,
                CH.Channel<
                  R1 & CL.HasClock,
                  E,
                  A.Chunk<A>,
                  unknown,
                  E,
                  A.Chunk<C1 | C2>,
                  void
                >
              > = pipe(
                T.do,
                T.bind("b", () => T.orDie(driver.last)),
                T.tap(() => driver.reset),
                T.map(({ b }) => CH.zipRight_(CH.write(A.single(g(b))), feed(in_)))
              )

              return CH.unwrap(T.orElse_(advance, () => reset))
            }

            const loop = (): CH.Channel<
              R1 & CL.HasClock,
              E,
              A.Chunk<A>,
              unknown,
              E,
              A.Chunk<C1 | C2>,
              void
            > =>
              CH.readWith(
                feed,
                (_) => CH.fail(_),
                (_) => CH.unit
              )

            return loop()
          })
        )
      )
    )
  )
}

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 *
 * This function accepts two conversion functions, which allow the output of this stream and the
 * output of the provided schedule to be unified into a single type. For example, `Either` or
 * similar data type.
 *
 * @ets_data_first repeatElementsWith_
 */
export function repeatElementsWith<R1, A, B, C1, C2>(
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
) {
  return <R, E>(self: Stream<R, E, A>) => repeatElementsWith_(self, schedule, f, g)
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition and can be unified with the stream elements using the provided functions.
 */
export function repeatWith_<R, R1, E, A, B, C1, C2>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
): Stream<R & R1 & Has<CL.Clock>, E, C1 | C2> {
  return C.unwrap(
    pipe(
      T.do,
      T.bind("driver", () => SC.driver(schedule)),
      T.map(({ driver }) => {
        const scheduleOutput = T.map_(T.orDie(driver.last), g)
        const process = C.map_(self, f).channel
        const loop: CH.Channel<
          R & R1 & CL.HasClock,
          unknown,
          unknown,
          unknown,
          E,
          A.Chunk<C1 | C2>,
          void
        > = CH.unwrap(
          T.fold_(
            driver.next(undefined),
            (_) => CH.unit,
            (_) =>
              CH.zipRight_(
                CH.zipRight_(
                  process,
                  CH.unwrap(T.map_(scheduleOutput, (o) => CH.write(A.single(o))))
                ),
                loop
              )
          )
        )

        return new Stream(CH.zipRight_(process, loop))
      })
    )
  )
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition and can be unified with the stream elements using the provided functions.
 *
 * @ets_data_first repeatWith_
 */
export function repeatWith<R1, A, B, C1, C2>(
  schedule: SC.Schedule<R1, any, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
) {
  return <R, E>(self: Stream<R, E, A>) => repeatWith_(self, schedule, f, g)
}

/**
 * Fails with the error `None` if value is `Left`.
 */
export function right<R, E, A1, A2>(
  self: Stream<R, E, E.Either<A1, A2>>
): Stream<R, O.Option<E>, A2> {
  return rightOrFail_(mapError_(self, O.some), () => O.none)
}

/**
 * Fails with given error 'e' if value is `Left`.
 */
export function rightOrFail_<R, E, E1, A1, A2>(
  self: Stream<R, E, E.Either<A1, A2>>,
  e: () => E1
): Stream<R, E | E1, A2> {
  return C.mapEffect_(
    self,
    E.fold(
      () => T.fail(e()),
      (_) => T.succeed(_)
    )
  )
}

/**
 * Fails with given error 'e' if value is `Left`.
 *
 * @ets_data_first rightOrFail_
 */
export function rightOrFail<E1>(e: () => E1) {
  return <R, E, A1, A2>(self: Stream<R, E, E.Either<A1, A2>>) => rightOrFail_(self, e)
}

export function runManaged_<R, R1, E, A, E2, B, L>(
  self: Stream<R, E, A>,
  sink: SK.Sink<R1, E, A, E2, L, B>
): M.Managed<R & R1, E2, B> {
  return pipe(CH.pipeTo_(self.channel, sink.channel), CH.drain, CH.runManaged)
}

/**
 * Runs the stream and emits the number of elements processed
 */
export function runCount<R, E, A>(self: Stream<R, E, A>): T.Effect<R, E, number> {
  return C.run_(self, SK.count())
}

/**
 * Runs the stream to collect the first value emitted by it without running
 * the rest of the stream.
 */
export function runHead<R, E, A>(self: Stream<R, E, A>): T.Effect<R, E, O.Option<A>> {
  return C.run_(self, SK.head())
}

/**
 * Runs the stream to completion and yields the last value emitted by it,
 * discarding the rest of the elements.
 */
export function runLast<R, E, A>(self: Stream<R, E, A>): T.Effect<R, E, O.Option<A>> {
  return C.run_(self, SK.last())
}

/**
 * Runs the stream to a sink which sums elements, provided they are Numeric.
 */
export function runSum<R, E>(self: Stream<R, E, number>): T.Effect<R, E, number> {
  return C.run_(self, SK.sum())
}

/**
 * @ets_data_first runManaged_
 */
export function runManaged<R1, E, A, E2, B>(sink: SK.Sink<R1, E, A, E2, any, B>) {
  return <R>(self: Stream<R, E, A>) => runManaged_(self, sink)
}

/**
 * Statefully maps over the elements of this stream to produce all intermediate results
 * of type `S` given an initial S.
 */
export function scan_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => S
): Stream<R, E, S> {
  return scanEffect_(self, s, (s, a) => T.succeed(f(s, a)))
}

/**
 * Statefully maps over the elements of this stream to produce all intermediate results
 * of type `S` given an initial S.
 *
 * @ets_data_first scan_
 */
export function scan<A, S>(s: S, f: (s: S, a: A) => S) {
  return <R, E>(self: Stream<R, E, A>) => scan_(self, s, f)
}

/**
 * Statefully maps over the elements of this stream to produce all intermediate results.
 *
 * See also `Stream#scan`.
 */
export function scanReduce_<R, E, A, A1 extends A>(
  self: Stream<R, E, A>,
  f: (a1: A1, a: A) => A1
): Stream<R, E, A1> {
  return scanReduceEffect_(self, (curr, next) => T.succeed(f(curr, next)))
}

/**
 * Statefully maps over the elements of this stream to produce all intermediate results.
 *
 * See also `Stream#scan`.
 *
 * @ets_data_first scanReduce_
 */
export function scanReduce<A, A1 extends A>(f: (a1: A1, a: A) => A1) {
  return <R, E>(self: Stream<R, E, A>) => scanReduce_(self, f)
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results.
 *
 * See also `Stream#scanEffect`.
 */
export function scanReduceEffect_<R, R1, E, E1, A, A1 extends A>(
  self: Stream<R, E, A>,
  f: (a1: A1, a: A) => T.Effect<R1, E1, A1>
): Stream<R & R1, E | E1, A1> {
  return mapAccumEffect_(self, O.emptyOf<A1>(), (s, a) =>
    O.fold_(
      s,
      () => T.succeed(Tp.tuple(O.some(a as A1), a as A1)),
      (a1) => T.map_(f(a1, a), (a2) => Tp.tuple(O.some(a2), a2))
    )
  )
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results.
 *
 * See also `Stream#scanEffect`.
 *
 * @ets_data_first scanReduceEffect_
 */
export function scanReduceEffect<R1, E1, A, A1 extends A>(
  f: (a1: A1, a: A) => T.Effect<R1, E1, A1>
) {
  return <R, E>(self: Stream<R, E, A>) => scanReduceEffect_(self, f)
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results of type `S` given an initial S.
 */
export function scanEffect_<R, R1, E, E1, A, S>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
): Stream<R & R1, E | E1, S> {
  return concat_(
    C.succeed(s),
    mapAccumEffect_(self, s, (s, a) => T.map_(f(s, a), (s) => Tp.tuple(s, s)))
  )
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results of type `S` given an initial S.
 *
 * @ets_data_first scanEffect_
 */
export function scanEffect<R1, E1, A, S>(s: S, f: (s: S, a: A) => T.Effect<R1, E1, S>) {
  return <R, E>(self: Stream<R, E, A>) => scanEffect_(self, s, f)
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule_<R, R1, E, A extends B, B, Z>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, B, Z>
): Stream<R & Has<CL.Clock> & R1, E, A> {
  return collect_(
    scheduleEither_(self, schedule),
    E.fold(
      (_) => O.none,
      (r) => O.some(r)
    )
  )
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 *
 * @ets_data_first schedule_
 */
export function schedule<R1, B, Z>(schedule: SC.Schedule<R1, B, Z>) {
  return <R, E, A extends B>(self: Stream<R, E, A>) => schedule_(self, schedule)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither_<R, R1, E, A, B>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>
): Stream<R & Has<CL.Clock> & R1, E, E.Either<B, A>> {
  return scheduleWith_(
    self,
    schedule,
    (r) => E.right(r),
    (l) => E.left(l)
  )
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 *
 * @ets_data_first scheduleEither_
 */
export function scheduleEither<R1, A, B>(schedule: SC.Schedule<R1, A, B>) {
  return <R, E>(self: Stream<R, E, A>) => scheduleEither_(self, schedule)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 */
export function scheduleWith_<R, R1, E, A, B, C1, C2>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
): Stream<R & Has<CL.Clock> & R1, E, C1 | C2> {
  return C.unwrap(
    T.map_(SC.driver(schedule), (driver) =>
      C.loopOnPartialChunksElements_(self, (a, emit) =>
        T.orElse_(T.zipRight_(driver.next(a), emit(f(a))), () =>
          pipe(
            driver.last,
            T.orDie,
            T.chain((b) => T.zipRight_(emit(f(a)), emit(g(b)))),
            T.zipLeft(driver.reset)
          )
        )
      )
    )
  )
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 *
 * @ets_data_first scheduleWith_
 */
export function scheduleWith<R1, A, B, C1, C2>(
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
) {
  return <R, E>(self: Stream<R, E, A>) => scheduleWith_(self, schedule, f, g)
}

/**
 * Converts an option on values into an option on errors.
 */
export function some<R, E, A>(self: Stream<R, E, O.Option<A>>) {
  return someOrFail_(mapError_(self, O.some), O.none)
}

/**
 * Extracts the optional value, or returns the given 'default'.
 */
export function someOrElse_<R, E, A>(
  self: Stream<R, E, O.Option<A>>,
  default_: A
): Stream<R, E, A> {
  return C.map_(
    self,
    O.getOrElseS(() => default_)
  )
}

/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @ets_data_first someOrElse_
 */
export function someOrElse<A>(default_: A) {
  return <R, E>(self: Stream<R, E, O.Option<A>>) => someOrElse_(self, default_)
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail_<R, E, E1, A>(
  self: Stream<R, E, O.Option<A>>,
  e: E1
): Stream<R, E | E1, A> {
  return C.mapEffect_(
    self,
    O.fold(
      () => T.fail(e),
      (_) => T.succeed(_)
    )
  )
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @ets_data_first someOrFail_
 */
export function someOrFail<E1>(e: E1) {
  return <R, E, A>(self: Stream<R, E, O.Option<A>>) => someOrFail_(self, e)
}

/**
 * Takes the last specified number of elements from this stream.
 */
export function takeRight_<R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A> {
  if (n <= 0) {
    return C.empty
  }

  return new Stream(
    CH.unwrap(
      pipe(
        T.do,
        T.bind("queue", () => T.succeedWith(() => new RingBuffer<A>(n))),
        T.map(({ queue }) => {
          const reader: CH.Channel<
            unknown,
            E,
            A.Chunk<A>,
            unknown,
            E,
            A.Chunk<A>,
            void
          > = CH.readWith(
            (in_) => {
              A.forEach_(in_, (_) => queue.push(_))

              return reader
            },
            (_) => CH.fail(_),
            (_) => CH.zipRight_(CH.write(A.from(L.toArray(queue.list))), CH.unit)
          )

          return self.channel[">>>"](reader)
        })
      )
    )
  )
}

/**
 * Takes the last specified number of elements from this stream.
 *
 * @ets_data_first takeRight_
 */
export function takeRight(n: number) {
  return <R, E, A>(self: Stream<R, E, A>) => takeRight_(self, n)
}

/**
 * Takes all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function takeUntil_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>
): Stream<R, E, A> {
  const loop: CH.Channel<R, E, A.Chunk<A>, unknown, E, A.Chunk<A>, any> = CH.readWith(
    (chunk) => {
      const taken = A.takeWhile_(chunk, (_) => !f(_))
      const last = A.take_(A.drop_(chunk, A.size(taken)), 1)

      if (A.isEmpty(last)) {
        return CH.zipRight_(CH.write(taken), loop)
      } else {
        return CH.write(A.concat_(taken, last))
      }
    },
    (_) => CH.fail(_),
    (_) => CH.succeed(_)
  )

  return new Stream(self.channel[">>>"](loop))
}

/**
 * Takes all elements of the stream until the specified predicate evaluates
 * to `true`.
 *
 * @ets_data_first takeUntil_
 */
export function takeUntil<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>) => takeUntil_(self, f)
}

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 */
export function takeUntilEffect_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, boolean>
): Stream<R & R1, E | E1, A> {
  return C.loopOnPartialChunks_(self, (chunk, emit) =>
    pipe(
      T.do,
      T.bind("taken", () =>
        A.takeWhileM_(chunk, (v) =>
          T.zipRight_(
            emit(v),
            T.map_(f(v), (_) => !_)
          )
        )
      ),
      T.let("last", ({ taken }) => A.take_(A.drop_(chunk, A.size(taken)), 1)),
      T.map(({ last }) => A.isEmpty(last))
    )
  )
}

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 *
 * @ets_data_first takeUntilEffect_
 */
export function takeUntilEffect<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, A>) => takeUntilEffect_(self, f)
}

/**
 * Takes all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function takeWhile_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>
): Stream<R, E, A> {
  const loop: CH.Channel<R, E, A.Chunk<A>, unknown, E, A.Chunk<A>, any> = CH.readWith(
    (chunk) => {
      const taken = A.takeWhile_(chunk, f)
      const more = A.size(taken) === A.size(chunk)

      if (more) {
        return CH.zipRight_(CH.write(taken), loop)
      } else {
        return CH.write(taken)
      }
    },
    (_) => CH.fail(_),
    (_) => CH.succeed(_)
  )

  return new Stream(self.channel[">>>"](loop))
}

/**
 * Takes all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 *
 * @ets_data_first takeWhile_
 */
export function takeWhile<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>) => takeWhile_(self, f)
}

/**
 * Adds an effect to consumption of every element of the stream.
 */
export function tap_<R, R1, E, E1, A, Z>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, Z>
): Stream<R & R1, E | E1, A> {
  return C.mapEffect_(self, (a) => T.as_(f(a), a))
}

/**
 * Adds an effect to consumption of every element of the stream.
 *
 * @ets_data_first tap_
 */
export function tap<R1, E1, A, Z>(f: (a: A) => T.Effect<R1, E1, Z>) {
  return <R, E>(self: Stream<R, E, A>) => tap_(self, f)
}

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` function.
 */
export function throttleEnforce_<R, E, A>(
  self: Stream<R, E, A>,
  units: number,
  duration: number,
  costFn: (c: A.Chunk<A>) => number,
  burst = 0
): Stream<Has<CL.Clock> & R, E, A> {
  return throttleEnforceEffect_(
    self,
    units,
    duration,
    (as) => T.succeed(costFn(as)),
    burst
  )
}

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` function.
 *
 * @ets_data_first throttleEnforce_
 */
export function throttleEnforce<A>(
  units: number,
  duration: number,
  costFn: (c: A.Chunk<A>) => number,
  burst = 0
) {
  return <R, E>(self: Stream<R, E, A>) =>
    throttleEnforce_(self, units, duration, costFn, burst)
}

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` effectful function.
 */
export function throttleEnforceEffect_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  units: number,
  duration: number,
  costFn: (c: A.Chunk<A>) => T.Effect<R1, E1, number>,
  burst = 0
): Stream<CL.HasClock & R & R1, E | E1, A> {
  const loop = (
    tokens: number,
    timestamp: number
  ): CH.Channel<
    R1 & CL.HasClock,
    E | E1,
    A.Chunk<A>,
    unknown,
    E | E1,
    A.Chunk<A>,
    void
  > =>
    CH.readWith(
      (in_) =>
        CH.unwrap(
          T.map_(
            T.zip_(costFn(in_), CL.currentTime),
            ({ tuple: [weight, current] }) => {
              const elapsed = current - timestamp
              const cycles = elapsed / duration
              const available = (() => {
                const sum = Math.floor(tokens + cycles * units)
                const max = units + burst < 0 ? Number.MAX_SAFE_INTEGER : units + burst

                return sum < 0 ? max : Math.min(sum, max)
              })()

              if (weight <= available) {
                return CH.zipRight_(CH.write(in_), loop(available - weight, current))
              } else {
                return loop(available, current)
              }
            }
          )
        ),
      (e) => CH.fail(e),
      (_) => CH.unit
    )

  return new Stream(
    CH.chain_(CH.fromEffect(CL.currentTime), (_) => self.channel[">>>"](loop(units, _)))
  )
}

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` effectful function.
 *
 * @ets_data_first throttleEnforceEffect_
 */
export function throttleEnforceEffect<R1, E1, A>(
  units: number,
  duration: number,
  costFn: (c: A.Chunk<A>) => T.Effect<R1, E1, number>,
  burst = 0
) {
  return <R, E>(self: Stream<R, E, A>) =>
    throttleEnforceEffect_(self, units, duration, costFn, burst)
}

/**
 * Delays the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. The weight of each chunk is determined by the `costFn`
 * function.
 */
export function throttleShape_<R, E, A>(
  self: Stream<R, E, A>,
  units: number,
  duration: number,
  costFn: (a: A.Chunk<A>) => number,
  burst = 0
): Stream<CL.HasClock & R, E, A> {
  return throttleShapeEffect_(
    self,
    units,
    duration,
    (os) => T.succeed(costFn(os)),
    burst
  )
}

/**
 * Delays the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. The weight of each chunk is determined by the `costFn`
 * function.
 *
 * @ets_data_first throttleShape_
 */
export function throttleShape<A>(
  units: number,
  duration: number,
  costFn: (a: A.Chunk<A>) => number,
  burst = 0
) {
  return <R, E>(self: Stream<R, E, A>) =>
    throttleShape_(self, units, duration, costFn, burst)
}

/**
 * Delays the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. The weight of each chunk is determined by the `costFn`
 * effectful function.
 */
export function throttleShapeEffect_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  units: number,
  duration: number,
  costFn: (a: A.Chunk<A>) => T.Effect<R1, E1, number>,
  burst = 0
): Stream<CL.HasClock & R & R1, E | E1, A> {
  const loop = (
    tokens: number,
    timestamp: number
  ): CH.Channel<
    R1 & CL.HasClock,
    E | E1,
    A.Chunk<A>,
    unknown,
    E | E1,
    A.Chunk<A>,
    void
  > =>
    CH.readWith(
      (in_) =>
        CH.unwrap(
          pipe(
            T.do,
            T.bind("weight", () => costFn(in_)),
            T.bind("current", () => CL.currentTime),
            T.map(({ current, weight }) => {
              const elapsed = current - timestamp
              const cycles = elapsed - duration
              const available = (() => {
                const sum = Math.floor(tokens + cycles * units)
                const max = units + burst < 0 ? Number.MAX_SAFE_INTEGER : units + burst

                return sum < 0 ? max : Math.min(sum, max)
              })()

              const remaining = available - weight
              const waitCycles = remaining >= 0 ? 0 : -remaining / units
              const delay = Math.floor(waitCycles * duration)

              if (delay > 0) {
                return CH.zipRight_(
                  CH.zipRight_(CH.fromEffect(CL.sleep(delay)), CH.write(in_)),
                  loop(remaining, current)
                )
              } else {
                return CH.zipRight_(CH.write(in_), loop(remaining, current))
              }
            })
          )
        ),
      (e) => CH.fail(e),
      (_) => CH.unit
    )

  return new Stream(
    CH.chain_(CH.fromEffect(CL.currentTime), (_) => self.channel[">>>"](loop(units, _)))
  )
}

/**
 * Delays the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. The weight of each chunk is determined by the `costFn`
 * effectful function.
 *
 * @ets_data_first throttleShapeEffect_
 */
export function throttleShapeEffect<R1, E1, A>(
  units: number,
  duration: number,
  costFn: (a: A.Chunk<A>) => T.Effect<R1, E1, number>,
  burst = 0
) {
  return <R, E>(self: Stream<R, E, A>) =>
    throttleShapeEffect_(self, units, duration, costFn, burst)
}

const NotStartedTypeId = Symbol()
class NotStarted {
  readonly _typeId: typeof NotStartedTypeId = NotStartedTypeId
}

const PreviousTypeId = Symbol()
class Previous<A> {
  readonly _typeId: typeof PreviousTypeId = PreviousTypeId

  constructor(public fiber: F.Fiber<never, A.Chunk<A>>) {}
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
  self: Stream<R, E, A>,
  d: number
): Stream<Has<CL.Clock> & R, E, A> {
  return C.unwrap(
    pipe(
      T.do,
      T.bind("scope", () => T.forkScope),
      T.bind("handoff", () => HO.make<HO.HandoffSignal<void, E, A>>()),
      T.map(({ handoff, scope }) => {
        const enqueue = (last: A.Chunk<A>) =>
          pipe(
            T.do,
            T.bind("f", () => pipe(CL.sleep(d), T.as(last), T.forkIn(scope))),
            T.map(({ f }) => consumer(new Previous(f)))
          )

        const producer: CH.Channel<
          R & CL.HasClock,
          E,
          A.Chunk<A>,
          unknown,
          E,
          never,
          any
        > = CH.readWithCause(
          (in_) =>
            O.fold_(
              A.last(in_),
              () => producer,
              (last) =>
                CH.zipRight_(
                  CH.fromEffect(HO.offer(handoff, new HO.Emit(A.single(last)))),
                  producer
                )
            ),
          (cause) => CH.fromEffect(HO.offer(handoff, new HO.Halt(cause))),
          (_) => CH.fromEffect(HO.offer(handoff, new HO.End(new SER.UpstreamEnd())))
        )

        const consumer = (
          state: DebounceState<E, A>
        ): CH.Channel<CL.HasClock & R, unknown, unknown, unknown, E, A.Chunk<A>, any> =>
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

        return Z.zipRight_(
          C.managed(M.fork(CH.runManaged(self.channel[">>>"](producer)))),
          new Stream(consumer(new NotStarted()))
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
  return <R, E, A>(self: Stream<R, E, A>) => debounce_(self, d)
}

/**
 * Ends the stream if it does not produce a value after d duration.
 */
export function timeout_<R, E, A>(
  self: Stream<R, E, A>,
  d: number
): Stream<R & Has<CL.Clock>, E, A> {
  return fromPull(
    M.map_(C.toPull(self), (pull) => T.timeoutFail_(pull, d, () => O.none))
  )
}

/**
 * Ends the stream if it does not produce a value after d duration.
 *
 * @ets_data_first timeout_
 */
export function timeout(d: number) {
  return <R, E, A>(self: Stream<R, E, A>) => timeout_(self, d)
}

/**
 * Fails the stream with given error if it does not produce a value after d duration.
 */
export function timeoutFail_<R, E, E1, A>(
  self: Stream<R, E, A>,
  e: E1,
  d: number
): Stream<R & Has<CL.Clock>, E | E1, A> {
  return timeoutFailCause_(self, CS.fail(e), d)
}

/**
 * Fails the stream with given error if it does not produce a value after d duration.
 *
 * @ets_data_first timeoutFail_
 */
export function timeoutFail<E1>(e: E1, d: number) {
  return <R, E, A>(self: Stream<R, E, A>) => timeoutFail_(self, e, d)
}

/**
 * Fails the stream with given cause if it does not produce a value after d duration.
 */
export function timeoutFailCause_<R, E, E1, A>(
  self: Stream<R, E, A>,
  cause: CS.Cause<E1>,
  d: number
): Stream<R & Has<CL.Clock>, E | E1, A> {
  return fromPull(
    M.map_(C.toPull(self), (pull) =>
      T.timeoutFailCause_(pull, () => CS.map_(cause, (_) => O.some<E | E1>(_)), d)
    )
  )
}

/**
 * Fails the stream with given cause if it does not produce a value after d duration.
 *
 * @ets_data_first timeoutFailCause_
 */
export function timeoutFailCause<E1>(cause: CS.Cause<E1>, d: number) {
  return <R, E, A>(self: Stream<R, E, A>) => timeoutFailCause_(self, cause, d)
}

export const StreamTimeoutSymbol: unique symbol = Symbol.for(
  "@matechs/core/symbols/errors/StreamTimeout"
)

export class StreamTimeoutError {
  readonly [StreamTimeoutSymbol] = "StreamTimeoutError"

  constructor(readonly message?: string) {}
}

export const isRuntime = (u: unknown): u is StreamTimeoutError =>
  u instanceof StreamTimeoutError && u[StreamTimeoutSymbol] === "StreamTimeoutError"

/**
 * Switches the stream if it does not produce a value after d duration.
 */
export function timeoutTo_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  d: number,
  that: Stream<R1, E1, A1>
): Stream<R & Has<CL.Clock> & R1, E | E1, A | A1> {
  return catchSomeCause_(
    timeoutFailCause_(self, CS.die(new StreamTimeoutError()), d),
    (e) => {
      if (e._tag === "Die") {
        return O.some(that)
      }

      return O.none
    }
  )
}

/**
 * Switches the stream if it does not produce a value after d duration.
 *
 * @ets_data_first timeoutTo_
 */
export function timeoutTo<R1, E1, A1>(d: number, that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => timeoutTo_(self, d, that)
}

/**
 * Converts the stream to a managed hub of chunks. After the managed hub is used,
 * the hub will never again produce values and should be discarded.
 */
export function toHub_<R, E, A>(
  self: Stream<R, E, A>,
  capacity: number
): M.Managed<R, never, H.Hub<Take.Take<E, A>>> {
  return pipe(
    M.do,
    M.bind("hub", () =>
      T.toManagedRelease_(H.makeBounded<Take.Take<E, A>>(capacity), (_) =>
        H.shutdown(_)
      )
    ),
    M.tap(({ hub }) => M.fork(runIntoHubManaged_(self, hub))),
    M.map(({ hub }) => hub)
  )
}

/**
 * Converts the stream to a managed hub of chunks. After the managed hub is used,
 * the hub will never again produce values and should be discarded.
 *
 * @ets_data_first toHub_
 */
export function toHub(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>) => toHub_(self, capacity)
}

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueue_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2
): M.Managed<R, never, Q.Queue<Take.Take<E, A>>> {
  return pipe(
    M.do,
    M.bind("queue", () =>
      T.toManagedRelease_(Q.makeBounded<Take.Take<E, A>>(capacity), Q.shutdown)
    ),
    M.tap(({ queue }) => M.fork(runIntoManaged_(self, queue))),
    M.map(({ queue }) => queue)
  )
}

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 *
 * @ets_data_first toQueue_
 */
export function toQueue(capacity = 2) {
  return <R, E, A>(self: Stream<R, E, A>) => toQueue_(self, capacity)
}

/**
 * Converts the stream to a dropping managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueueDropping_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2
): M.Managed<R, never, Q.Queue<Take.Take<E, A>>> {
  return pipe(
    M.do,
    M.bind("queue", () =>
      T.toManagedRelease_(Q.makeDropping<Take.Take<E, A>>(capacity), Q.shutdown)
    ),
    M.tap(({ queue }) => M.fork(runIntoManaged_(self, queue))),
    M.map(({ queue }) => queue)
  )
}

/**
 * Converts the stream to a dropping managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 *
 * @ets_data_first toQueueDropping_
 */
export function toQueueDropping(capacity = 2) {
  return <R, E, A>(self: Stream<R, E, A>) => toQueueDropping_(self, capacity)
}

/**
 * Converts the stream to a managed queue of elements. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueueOfElements_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2
): M.Managed<R, never, Q.Queue<Ex.Exit<O.Option<E>, A>>> {
  return pipe(
    M.do,
    M.bind("queue", () =>
      T.toManagedRelease_(Q.makeBounded<Ex.Exit<O.Option<E>, A>>(capacity), Q.shutdown)
    ),
    M.tap(({ queue }) => M.fork(runIntoElementsManaged_(self, queue))),
    M.map(({ queue }) => queue)
  )
}

/**
 * Converts the stream to a managed queue of elements. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 *
 * @ets_data_first toQueueOfElements_
 */
export function toQueueOfElements(capacity = 2) {
  return <R, E, A>(self: Stream<R, E, A>) => toQueueOfElements_(self, capacity)
}

/**
 * Converts the stream to a sliding managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueueSliding_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2
): M.Managed<R, never, Q.Queue<Take.Take<E, A>>> {
  return pipe(
    M.do,
    M.bind("queue", () =>
      T.toManagedRelease_(Q.makeSliding<Take.Take<E, A>>(capacity), Q.shutdown)
    ),
    M.tap(({ queue }) => M.fork(runIntoManaged_(self, queue))),
    M.map(({ queue }) => queue)
  )
}

/**
 * Converts the stream to a sliding managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 *
 * @ets_data_first toQueueSliding_
 */
export function toQueueSliding(capacity = 2) {
  return <R, E, A>(self: Stream<R, E, A>) => toQueueSliding_(self, capacity)
}

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export function fromEffect<R, E, A>(fa: T.Effect<R, E, A>): Stream<R, E, A> {
  return fromEffectOption(T.mapError_(fa, O.some))
}

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export function fromEffectOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
): Stream<R, E, A> {
  return new Stream(
    CH.unwrap(
      T.fold_(
        fa,
        O.fold(
          () => CH.end(undefined),
          (e) => CH.fail(e)
        ),
        (a) => CH.write(A.single(a))
      )
    )
  )
}

export const DEFAULT_CHUNK_SIZE = 4096

/**
 * Creates a stream from a `XQueue` of values
 */
export function fromQueue_<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, O>,
  maxChunkSize: number = DEFAULT_CHUNK_SIZE
): Stream<R, E, O> {
  return repeatEffectChunkOption(
    pipe(
      Q.takeBetween_(queue, 1, maxChunkSize),
      T.map(A.from),
      T.catchAllCause((c) =>
        T.chain_(Q.isShutdown(queue), (down) => {
          if (down && CS.interrupted(c)) {
            return Pull.end
          } else {
            return Pull.failCause(c)
          }
        })
      )
    )
  )
}

/**
 * Creates a stream from a `XQueue` of values
 */
export function fromQueue(maxChunkSize: number = DEFAULT_CHUNK_SIZE) {
  return <R, E, O>(queue: Q.XQueue<never, R, unknown, E, never, O>) =>
    fromQueue_(queue, maxChunkSize)
}

/**
 * Creates a stream from an effect producing chunks of `A` values until it fails with None.
 */
export function repeatEffectChunkOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A.Chunk<A>>
): Stream<R, E, A> {
  return C.unfoldChunkEffect(undefined, (_) => {
    return T.catchAll_(
      T.map_(fa, (chunk) => O.some(Tp.tuple(chunk, undefined))),
      O.fold(
        () => T.none,
        (e) => T.fail(e)
      )
    )
  })
}

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldEffect<R, E, A, S>(
  s: S,
  f: (s: S) => T.Effect<R, E, O.Option<Tp.Tuple<[A, S]>>>
): Stream<R, E, A> {
  return C.unfoldChunkEffect(s, (_) =>
    T.map_(
      f(_),
      O.map(({ tuple: [a, s] }) => Tp.tuple(A.single(a), s))
    )
  )
}

/**
 * Converts the stream into an unbounded managed queue. After the managed queue
 * is used, the queue will never again produce values and should be discarded.
 */
export function toQueueUnbounded<R, E, A>(
  self: Stream<R, E, A>
): M.Managed<R, never, Q.Queue<Take.Take<E, A>>> {
  return pipe(
    M.do,
    M.bind("queue", () =>
      T.toManagedRelease_(Q.makeUnbounded<Take.Take<E, A>>(), Q.shutdown)
    ),
    M.tap(({ queue }) => M.fork(runIntoManaged_(self, queue))),
    M.map(({ queue }) => queue)
  )
}

/**
 * Applies the transducer to the stream and emits its outputs.
 */
export function transduce_<R, R1, E, E1, A, Z>(
  self: Stream<R, E, A>,
  sink: SK.Sink<R1, E, A, E1, A, Z>
): Stream<R & R1, E1, Z> {
  return new Stream(
    CH.suspend(() => {
      const leftovers = new AtomicReference(A.empty<A.Chunk<A>>())
      const upstreamDone = new AtomicBoolean(false)
      const buffer: CH.Channel<
        unknown,
        E,
        A.Chunk<A>,
        unknown,
        E,
        A.Chunk<A>,
        any
      > = CH.suspend(() => {
        const l = leftovers.get

        if (A.isEmpty(l)) {
          return CH.readWith(
            (c) => CH.zipRight_(CH.write(c), buffer),
            (e) => CH.fail(e),
            (done) => CH.end(done)
          )
        } else {
          leftovers.set(A.empty())

          return CH.zipRight_(CH.writeChunk(l), buffer)
        }
      })

      const concatAndGet = (c: A.Chunk<A.Chunk<A>>): A.Chunk<A.Chunk<A>> => {
        const ls = leftovers.get
        const concat = A.concat_(
          ls,
          A.filter_(c, (a) => !A.isEmpty(a))
        )

        leftovers.set(concat)

        return concat
      }
      const upstreamMarker: CH.Channel<
        unknown,
        E,
        A.Chunk<A>,
        unknown,
        E,
        A.Chunk<A>,
        any
      > = CH.readWith(
        (_in) => CH.zipRight_(CH.write(_in), upstreamMarker),
        (err) => CH.fail(err),
        (done) =>
          CH.zipRight_(
            CH.succeedWith(() => upstreamDone.set(true)),
            CH.end(done)
          )
      )

      const transducer: CH.Channel<
        R1,
        E,
        A.Chunk<A>,
        unknown,
        E1,
        A.Chunk<Z>,
        void
      > = CH.chain_(CH.doneCollect(sink.channel), ({ tuple: [leftover, z] }) =>
        CH.chain_(
          CH.succeedWith(() => Tp.tuple(upstreamDone.get, concatAndGet(leftover))),
          ({ tuple: [done, newLeftovers] }) => {
            const nextChannel =
              done && A.isEmpty(newLeftovers) ? CH.end(undefined) : transducer

            return CH.zipRight_(CH.write(A.single(z)), nextChannel)
          }
        )
      )

      return self.channel[">>>"](upstreamMarker)[">>>"](buffer)[">>>"](transducer)
    })
  )
}

/**
 * Applies the transducer to the stream and emits its outputs.
 *
 * @ets_data_first transduce_
 */
export function transduce<R, R1, E, E1, A, Z>(sink: SK.Sink<R1, E, A, E1, A, Z>) {
  return (self: Stream<R, E, A>) => transduce_(self, sink)
}

/**
 * Threads the stream through the transformation function `f`.
 */
export function via_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  f: (a: Stream<R, E, A>) => Stream<R1, E1, A1>
): Stream<R1, E1, A1> {
  return f(self)
}

/**
 * Threads the stream through the transformation function `f`.
 *
 * @ets_data_first via_
 */
export function via<R, R1, E, E1, A, A1>(
  f: (a: Stream<R, E, A>) => Stream<R1, E1, A1>
) {
  return (self: Stream<R, E, A>) => via_(self, f)
}

/**
 * Creates a stream from a subscription to a hub.
 */
export function fromHub_<R, E, A>(
  hub: H.XHub<never, R, unknown, E, never, A>,
  maxChunkSize = DEFAULT_CHUNK_SIZE
): Stream<R, E, A> {
  return C.chain_(C.managed(H.subscribe(hub)), (queue) =>
    fromQueue_(queue, maxChunkSize)
  )
}

/**
 * Creates a stream from a subscription to a hub.
 *
 * @ets_data_first fromHub_
 */
export function fromHub(maxChunkSize = DEFAULT_CHUNK_SIZE) {
  return <R, E, A>(hub: H.XHub<never, R, unknown, E, never, A>) =>
    fromHub_(hub, maxChunkSize)
}

/**
 * The stream that always fails with `cause`.
 */
export function failCause<E>(cause: CS.Cause<E>): Stream<unknown, E, never> {
  return fromEffect(T.halt(cause))
}

export function fromPull<R, E, A>(
  io: M.Managed<R, never, T.Effect<R, O.Option<E>, A.Chunk<A>>>
): Stream<R, E, A> {
  return C.unwrapManaged(M.map_(io, (pull) => repeatEffectChunkOption(pull)))
}

/**
 * Zips this stream together with the index of elements.
 */
export function zipWithIndex<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, Tp.Tuple<[A, number]>> {
  return mapAccum_(self, 0, (index, a) => Tp.tuple(index + 1, Tp.tuple(a, index)))
}

/**
 * Zips the two streams so that when a value is emitted by either of the two streams,
 * it is combined with the latest value from the other stream to produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means that
 * emitted elements that are not the last value in chunks will never be used for zipping.
 */
export function zipWithLatest_<R, R1, E, E1, A, A1, A2>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => A2
): Stream<R & R1, E | E1, A2> {
  const mergedChannel: CH.Channel<
    R & R1,
    unknown,
    unknown,
    unknown,
    E | E1,
    O.Option<E.Either<A, A1>>,
    any
  > = pipe(
    self.channel,
    CH.mapOut((_) => O.map_(A.last(_), E.left)),
    CH.mergeWith(
      pipe(
        that.channel,
        CH.mapOut((_) => O.map_(A.last(_), E.right))
      ),
      (exit) => MD.done(T.done(exit)),
      (exit) => MD.done(T.done(exit))
    )
  )

  const writer = (
    lastLeft: O.Option<A>,
    lastRight: O.Option<A1>
  ): CH.Channel<
    R1,
    E | E1,
    O.Option<E.Either<A, A1>>,
    unknown,
    E | E1,
    A.Chunk<A2>,
    void
  > =>
    CH.readWith(
      (val) => {
        if (O.isSome(val)) {
          if (E.isLeft(val.value)) {
            const a1 = val.value.left

            if (O.isSome(lastRight)) {
              const a2 = lastRight.value

              return CH.zipRight_(
                CH.write(A.single(f(a1, a2))),
                writer(O.some(a1), lastRight)
              )
            } else {
              return writer(O.some(a1), lastRight)
            }
          } else {
            const a2 = val.value.right

            if (O.isSome(lastLeft)) {
              const a1 = lastLeft.value

              return CH.zipRight_(
                CH.write(A.single(f(a1, a2))),
                writer(lastLeft, O.some(a2))
              )
            } else {
              return writer(lastLeft, lastRight)
            }
          }
        } else {
          return writer(lastLeft, lastRight)
        }
      },
      (err) => CH.fail(err),
      (_) => CH.unit
    )

  return new Stream(mergedChannel[">>>"](writer(O.none, O.none)))
}

/**
 * Zips the two streams so that when a value is emitted by either of the two streams,
 * it is combined with the latest value from the other stream to produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means that
 * emitted elements that are not the last value in chunks will never be used for zipping.
 *
 * @ets_data_first zipWithLatest_
 */
export function zipWithLatest<R1, E1, A, A1, A2>(
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => A2
) {
  return <R, E>(self: Stream<R, E, A>) => zipWithLatest_(self, that, f)
}

/**
 * Zips each element with the next element if present.
 */
export function zipWithNext<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, Tp.Tuple<[A, O.Option<A>]>> {
  const process = (
    last: O.Option<A>
  ): CH.Channel<
    unknown,
    E,
    A.Chunk<A>,
    unknown,
    E,
    A.Chunk<Tp.Tuple<[A, O.Option<A>]>>,
    void
  > =>
    CH.readWith(
      (in_) => {
        const {
          tuple: [newlast, chunk]
        } = A.mapAccum_(in_, last, (prev, curr) =>
          Tp.tuple(
            O.some(curr),
            O.map_(prev, (_) => Tp.tuple(_, curr))
          )
        )
        const out = A.filterMap_(
          chunk,
          O.fold(
            () => O.none,
            ({ tuple: [prev, curr] }) => O.some(Tp.tuple(prev, O.some(curr)))
          )
        )

        return CH.zipRight_(CH.write(out), process(newlast))
      },
      (err) => CH.fail(err),
      (_) =>
        O.fold_(
          last,
          () => CH.unit,
          (value) => CH.zipRight_(CH.write(A.single(Tp.tuple(value, O.none))), CH.unit)
        )
    )

  return new Stream(self.channel[">>>"](process(O.none)))
}

/**
 * Zips each element with the previous element. Initially accompanied by `None`.
 */
export function zipWithPrevious<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, Tp.Tuple<[O.Option<A>, A]>> {
  return mapAccum_(self, O.emptyOf<A>(), (prev, next) =>
    Tp.tuple(O.some(next), Tp.tuple(prev, next))
  )
}

/**
 * Zips each element with both the previous and next element.
 */
export function zipWithPreviousAndNext<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, Tp.Tuple<[O.Option<A>, A, O.Option<A>]>> {
  return C.map_(
    zipWithNext(zipWithPrevious(self)),
    ({
      tuple: [
        {
          tuple: [prev, curr]
        },
        next
      ]
    }) => Tp.tuple(prev, curr, O.map_(next, Tp.get(1)))
  )
}

/**
 * Accesses the environment of the stream.
 */
export function access<R, A>(f: (r: R) => A): Stream<R, never, A> {
  return C.map_(environment<R>(), f)
}

/**
 * Accesses the environment of the stream in the context of an effect.
 */
export function accessEffect<R, R1, E, A>(
  f: (r: R) => T.Effect<R1, E, A>
): Stream<R & R1, E, A> {
  return C.mapEffect_(environment<R>(), f)
}

/**
 * Accesses the environment of the stream in the context of a stream.
 */
export function accessStream<R, E, A>(f: (r: R) => Stream<R, E, A>): Stream<R, E, A> {
  return C.chain_(environment<R>(), f)
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function acquireReleaseWith_<R, E, A, Z>(
  acquire: T.Effect<R, E, A>,
  release: (a: A) => T.RIO<R, Z>
): Stream<R, E, A> {
  return C.managed(M.make_(acquire, release))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 *
 * @ets_data_first acquireReleaseWith_
 */
export function acquireReleaseWith<R, A, Z>(release: (a: A) => T.RIO<R, Z>) {
  return <E>(acquire: T.Effect<R, E, A>) => acquireReleaseWith_(acquire, release)
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function acquireReleaseExitWith_<R, E, A, Z>(
  acquire: T.Effect<R, E, A>,
  release: (a: A, exit: Ex.Exit<any, any>) => T.RIO<R, Z>
): Stream<R, E, A> {
  return C.managed(M.makeExit_(acquire, release))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 *
 * @ets_data_first acquireReleaseExitWith_
 */
export function acquireReleaseExitWith<R, A, Z>(
  release: (a: A, exit: Ex.Exit<any, any>) => T.RIO<R, Z>
) {
  return <E>(acquire: T.Effect<R, E, A>) => acquireReleaseExitWith_(acquire, release)
}

/**
 * Concatenates all of the streams in the chunk to one stream.
 */
export function concatAll<R, E, O>(streams: A.Chunk<Stream<R, E, O>>): Stream<R, E, O> {
  return A.reduce_(streams, C.empty as Stream<R, E, O>, (a, b) => concat_(a, b))
}

/**
 * The stream that dies with an exception described by `msg`.
 */
export function dieMessage(msg: string): Stream<unknown, never, never> {
  return fromEffect(T.dieMessage(msg))
}

/**
 * The stream that ends with the `Exit` value `exit`.
 */
export function done<E, A>(exit: Ex.Exit<E, A>): Stream<unknown, E, A> {
  return fromEffect(T.done(exit))
}

/**
 * Accesses the whole environment of the stream.
 */
export function environment<R>(): Stream<R, never, R> {
  return fromEffect(T.environment<R>())
}

/**
 * Creates a stream from a subscription to a hub.
 */
export function fromChunkHub<R, E, O>(
  hub: H.XHub<never, R, unknown, E, never, A.Chunk<O>>
): Stream<R, E, O> {
  return C.chain_(C.managed(H.subscribe(hub)), (queue) => fromChunkQueue(queue))
}

/**
 * Creates a stream from a subscription to a hub in the context of a managed
 * effect. The managed effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 */
export function fromChunkHubManaged<R, E, O>(
  hub: H.XHub<never, R, unknown, E, never, A.Chunk<O>>
): M.Managed<unknown, never, C.Stream<R, E, O>> {
  return M.map_(H.subscribe(hub), (queue) => fromChunkQueue(queue))
}

// TODO: fromChunkHubWithShutdown -> missing ensuringFirst

// TODO: fromChunkHubManagedWithShutdown -> missing ensuringFirst

/**
 * Creates a stream from a queue of values
 */
export function fromChunkQueue<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, A.Chunk<O>>
): Stream<R, E, O> {
  return repeatEffectChunkOption(
    pipe(
      queue,
      Q.take,
      T.catchAllCause((c) =>
        T.chain_(Q.isShutdown(queue), (down) => {
          if (down && CS.interrupted(c)) {
            return Pull.end
          } else {
            return Pull.failCause(c)
          }
        })
      )
    )
  )
}

// TODO: fromChunkQueueWithShutdown -> Missing ensuringFirst

/**
 * Creates a stream from an arbitrary number of chunks.
 */
export function fromChunks<O>(...chunks: A.Chunk<O>[]): Stream<unknown, never, O> {
  return C.chain_(fromIterable(chunks), (_) => C.fromChunk(_))
}

/**
 * Creates a stream from an iterable collection of values
 */
export function fromIterable<O>(as: Iterable<O>): Stream<unknown, never, O> {
  return C.fromChunk(A.from(as))
}

/**
 * Creates a stream from an effect producing a value of type `Iterable[A]`
 */
export function fromIterableEffect<R, E, O>(
  iterable: T.Effect<R, E, Iterable<O>>
): Stream<R, E, O> {
  return mapConcat_(fromEffect(iterable), identity)
}

// TODO: fromHubManaged -> Missing fromQueueWithShutdown

// TODO: fromHubWithShutdown -> Missing ensuringFirst

// TODO: fromHubManagedWithShutdown -> Missing ensuringFirst

// TODO: fromQueueWithShutdown -> Missing ensuringFirst

/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export function fromSchedule<R, A>(
  schedule: SC.Schedule<R, unknown, A>
): Stream<CL.HasClock & R, never, A> {
  return C.unwrap(
    T.map_(SC.driver(schedule), (driver) => repeatEffOption(driver.next(undefined)))
  )
}

/**
 * Creates a stream from an effect producing chunks of `A` values until it fails with None.
 */
export function repeatEffChunkOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A.Chunk<A>>
): Stream<R, E, A> {
  return C.unfoldChunkEffect(undefined, (_) =>
    T.catchAll_(
      T.map_(fa, (chunk) => O.some(Tp.tuple(chunk, undefined))),
      O.fold(
        () => T.none,
        (e) => T.fail(e)
      )
    )
  )
}

/**
 * Creates a stream from an effect producing values of type `A` until it fails with None.
 */
export function repeatEffOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
): Stream<R, E, A> {
  return repeatEffectChunkOption(T.map_(fa, A.single))
}

// TODO: mergeAll -> Missing flattenPar

// TODO: mergeAllUnbounded -> Missing mergeAll

export const never: Stream<unknown, never, never> = fromEffect(T.never)

/**
 * Like `unfold`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginate<A, S>(
  s: S,
  f: (s: S) => Tp.Tuple<[A, O.Option<S>]>
): Stream<unknown, never, A> {
  return paginateChunk(s, (s) => {
    const {
      tuple: [a, b]
    } = f(s)

    return Tp.tuple(A.single(a), b)
  })
}

/**
 * Like `unfoldChunk`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateChunk<A, S>(
  s: S,
  f: (s: S) => Tp.Tuple<[A.Chunk<A>, O.Option<S>]>
): Stream<unknown, never, A> {
  const loop = (
    s: S
  ): CH.Channel<unknown, unknown, unknown, unknown, never, A.Chunk<A>, any> => {
    const {
      tuple: [as, o]
    } = f(s)

    return O.fold_(
      o,
      () => CH.zipRight_(CH.write(as), CH.end(undefined)),
      (s) => CH.zipRight_(CH.write(as), loop(s))
    )
  }

  return new Stream(loop(s))
}

/**
 * Like `unfoldChunkEff`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateChunkEffect<R, E, A, S>(
  s: S,
  f: (s: S) => T.Effect<R, E, Tp.Tuple<[A.Chunk<A>, O.Option<S>]>>
): Stream<R, E, A> {
  const loop = (s: S): CH.Channel<R, unknown, unknown, unknown, E, A.Chunk<A>, any> =>
    CH.unwrap(
      T.map_(f(s), ({ tuple: [as, o] }) =>
        O.fold_(
          o,
          () => CH.zipRight_(CH.write(as), CH.end(undefined)),
          (s) => CH.zipRight_(CH.write(as), loop(s))
        )
      )
    )

  return new Stream(loop(s))
}

/**
 * Like `unfoldEff`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateEffect<R, E, A, S>(
  s: S,
  f: (s: S) => T.Effect<R, E, Tp.Tuple<[A, O.Option<S>]>>
): Stream<R, E, A> {
  return paginateChunkEffect(s, (_) =>
    T.map_(f(_), ({ tuple: [a, s] }) => Tp.tuple(A.single(a), s))
  )
}

/**
 * Constructs a stream from a range of integers (lower bound included, upper bound not included)
 */
export function range(
  min: number,
  max: number,
  chunkSize = DEFAULT_CHUNK_SIZE
): Stream<unknown, never, number> {
  const go = (
    current: number
  ): CH.Channel<unknown, unknown, unknown, unknown, never, A.Chunk<number>, any> => {
    const remaining = max - current

    if (remaining > chunkSize) {
      return CH.zipRight_(
        CH.write(A.range(current, current + chunkSize)),
        go(current + chunkSize)
      )
    } else {
      return CH.write(A.range(current, current + remaining))
    }
  }

  return new Stream(go(min))
}

/**
 * Repeats the provided value infinitely.
 */
export function repeat<A>(a: A): Stream<unknown, never, A> {
  return new Stream(CH.repeated(CH.write(A.single(a))))
}

/**
 * Creates a stream from an effect producing a value of type `A` which repeats forever.
 */
export function repeatEffect<R, E, A>(fa: T.Effect<R, E, A>): Stream<R, E, A> {
  return repeatEffOption(T.mapError_(fa, O.some))
}

/**
 * Creates a stream from an effect producing chunks of `A` values which repeats forever.
 */
export function repeatEffChunk<R, E, A>(
  fa: T.Effect<R, E, A.Chunk<A>>
): Stream<R, E, A> {
  return repeatEffChunkOption(T.mapError_(fa, O.some))
}

/**
 * Creates a stream from an effect producing a value of type `A`, which is repeated using the
 * specified schedule.
 */
export function repeatEffWith<R, E, A>(
  effect: T.Effect<R, E, A>,
  schedule: SC.Schedule<R, A, any>
): Stream<R & Has<CL.Clock>, E, A> {
  return C.chain_(
    fromEffect(T.zip_(effect, SC.driver(schedule))),
    ({ tuple: [a, driver] }) =>
      concat_(
        C.succeed(a),
        unfoldEffect(a, (_) =>
          T.foldM_(
            driver.next(_),
            (_) => T.succeed(_),
            (_) => T.map_(effect, (nextA) => O.some(Tp.tuple(nextA, nextA)))
          )
        )
      )
  )
}

export function accessServiceM<A>(s: Tag<A>) {
  return <R, E, B>(f: (a: A) => T.Effect<R, E, B>) =>
    accessEffect((r: Has<A>) => f(r[s.key as any]))
}

/**
 * Accesses the specified service in the environment of the effect.
 */
export function service<T>(s: Tag<T>) {
  return accessServiceM(s)(T.succeed)
}

/**
 * Repeats the value using the provided schedule.
 */
export function repeatValueWith<R, A, Z>(
  a: A,
  schedule: SC.Schedule<R, A, Z>
): Stream<R & CL.HasClock, never, A> {
  return repeatEffWith(T.succeed(a), schedule)
}

/**
 * A stream that emits Unit values spaced by the specified duration.
 */
export function tick(interval: number): Stream<CL.HasClock, never, void> {
  return repeatValueWith(undefined, SC.spaced(interval))
}

/**
 * A stream that contains a single `Unit` value.
 */
export const unit: Stream<unknown, never, void> = C.succeed(undefined)

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`
 */
export function unfold<S, A>(
  s: S,
  f: (s: S) => O.Option<Tp.Tuple<[A, S]>>
): Stream<unknown, never, A> {
  return unfoldChunk(s, (_) =>
    O.map_(f(_), ({ tuple: [a, s] }) => Tp.tuple(A.single(a), s))
  )
}

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 */
export function unfoldChunk<S, A>(
  s: S,
  f: (s: S) => O.Option<Tp.Tuple<[A.Chunk<A>, S]>>
): Stream<unknown, never, A> {
  const loop = (
    s: S
  ): CH.Channel<unknown, unknown, unknown, unknown, never, A.Chunk<A>, any> =>
    O.fold_(
      f(s),
      () => CH.end(undefined),
      ({ tuple: [as, s] }) => CH.zipRight_(CH.write(as), loop(s))
    )

  return new Stream(loop(s))
}

/**
 * Partitions the stream with specified chunkSize
 * @param chunkSize size of the chunk
 */
export function grouped_<R, E, A>(
  self: Stream<R, E, A>,
  chunkSize: number
): Stream<R, E, A.Chunk<A>> {
  return transduce_(self, SK.collectAllN<E, A>(chunkSize))
}

/**
 * Partitions the stream with specified chunkSize
 * @param chunkSize size of the chunk
 *
 * @ets_data_first grouped_
 */
export function grouped(chunkSize: number) {
  return <R, E, A>(self: Stream<R, E, A>) => grouped_(self, chunkSize)
}

/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 */
export function groupedWithin_<R, E, A>(
  self: Stream<R, E, A>,
  chunkSize: number,
  within: number
): Stream<R & CL.HasClock, E, A.Chunk<A>> {
  return aggregateAsyncWithin_(self, SK.collectAllN<E, A>(chunkSize), SC.spaced(within))
}

/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 *
 * @ets_data_first groupedWithin_
 */
export function groupedWithin(chunkSize: number, within: number) {
  return <R, E, A>(self: Stream<R, E, A>) => groupedWithin_(self, chunkSize, within)
}

// TODO: groupBy -> Missing ensuringFirst

// TODO: groupByKey -> Missing groupBy

export type Canceler<R> = T.RIO<R, unknown>

interface AsyncEmitOps<R, E, A, B> {
  chunk(as: A.Chunk<A>): B
  die<Err>(err: Err): B
  dieMessage(message: string): B
  done(exit: Ex.Exit<E, A>): B
  end(): B
  fail(e: E): B
  fromEffect(io: T.Effect<R, E, A>): B
  fromEffectChunk(io: T.Effect<R, E, A.Chunk<A>>): B
  halt(cause: CS.Cause<E>): B
  single(a: A): B
}

export interface AsyncEmit<R, E, A, B> extends AsyncEmitOps<R, E, A, B> {
  (f: T.Effect<R, O.Option<E>, A.Chunk<A>>): B
}

function toAsyncEmit<R, E, A, B>(
  fn: (f: T.Effect<R, O.Option<E>, A.Chunk<A>>) => B
): AsyncEmit<R, E, A, B> {
  const ops: AsyncEmitOps<R, E, A, B> = {
    chunk(this: AsyncEmit<R, E, A, B>, as) {
      return this(T.succeed(as))
    },
    die<Err>(this: AsyncEmit<R, E, A, B>, err: Err): B {
      return this(T.die(err))
    },
    dieMessage(this: AsyncEmit<R, E, A, B>, message: string): B {
      return this(T.dieMessage(message))
    },
    done(this: AsyncEmit<R, E, A, B>, exit: Ex.Exit<E, A>): B {
      return this(
        T.done(
          Ex.mapBoth_(
            exit,
            (e) => O.some(e),
            (a) => A.single(a)
          )
        )
      )
    },
    end(this: AsyncEmit<R, E, A, B>): B {
      return this(T.fail(O.none))
    },
    fail(this: AsyncEmit<R, E, A, B>, e: E): B {
      return this(T.fail(O.some(e)))
    },
    fromEffect(this: AsyncEmit<R, E, A, B>, io: T.Effect<R, E, A>): B {
      return this(
        T.mapBoth_(
          io,
          (e) => O.some(e),
          (a) => A.single(a)
        )
      )
    },
    fromEffectChunk(this: AsyncEmit<R, E, A, B>, io: T.Effect<R, E, A.Chunk<A>>): B {
      return this(T.mapError_(io, (e) => O.some(e)))
    },
    halt(this: AsyncEmit<R, E, A, B>, cause: CS.Cause<E>): B {
      return this(T.halt(CS.map_(cause, (e) => O.some(e))))
    },
    single(this: AsyncEmit<R, E, A, B>, a: A): B {
      return this(T.succeed(A.single(a)))
    }
  }

  return Object.assign(fn, ops)
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function async<R, E, A>(
  register: (emit: AsyncEmit<R, E, A, void>) => void,
  outputBuffer = 16
): Stream<R, E, A> {
  return asyncMaybe<R, E, A>((callback) => {
    register(callback)
    return O.none
  }, outputBuffer)
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback can possibly return the stream synchronously.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function asyncMaybe<R, E, A>(
  register: (emit: AsyncEmit<R, E, A, void>) => O.Option<Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return asyncInterrupt<R, E, A>(
    (k) => E.fromOption_(register(k), () => T.unit),
    outputBuffer
  )
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export function asyncInterrupt<R, E, A>(
  register: (emit: AsyncEmit<R, E, A, void>) => E.Either<Canceler<R>, Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return C.unwrapManaged(
    pipe(
      M.do,
      M.bind("output", () =>
        T.toManagedRelease_(Q.makeBounded<Take.Take<E, A>>(outputBuffer), Q.shutdown)
      ),
      M.bind("runtime", () => M.runtime<R>()),
      M.bind("eitherStream", ({ output, runtime }) =>
        M.succeed(
          register(
            toAsyncEmit((k) => {
              try {
                runtime.run(T.chain_(Take.fromPull(k), (_) => Q.offer_(output, _)))
              } catch (e: unknown) {
                if (CS.isFiberFailure(e)) {
                  if (!CS.interrupted(e.cause)) {
                    throw e
                  }
                }
              }
            })
          )
        )
      ),
      M.map(({ eitherStream, output }) =>
        E.fold_(
          eitherStream,
          (canceler) => {
            const loop: CH.Channel<
              unknown,
              unknown,
              unknown,
              unknown,
              E,
              A.Chunk<A>,
              void
            > = CH.unwrap(
              pipe(
                Q.take(output),
                T.chain((_) => Take.done(_)),
                T.fold(
                  (maybeError) =>
                    CH.zipRight_(
                      CH.fromEffect(Q.shutdown(output)),
                      O.fold_(
                        maybeError,
                        () => CH.end(undefined),
                        (_) => CH.fail(_)
                      )
                    ),
                  (a) => CH.zipRight_(CH.write(a), loop)
                )
              )
            )

            return ensuring_(new Stream(loop), canceler)
          },
          (value) => C.unwrap(T.as_(Q.shutdown(output), value))
        )
      )
    )
  )
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times
 * The registration of the callback itself returns an effect. The optionality of the
 * error type `E` can be used to signal the end of the stream, by setting it to `None`.
 */
export function asyncEffect<R, E, A, Z>(
  register: (emit: AsyncEmit<R, E, A, void>) => T.Effect<R, E, Z>,
  outputBuffer = 16
): Stream<R, E, A> {
  return new Stream(
    CH.unwrapManaged(
      pipe(
        M.do,
        M.bind("output", () =>
          T.toManagedRelease_(Q.makeBounded<Take.Take<E, A>>(outputBuffer), Q.shutdown)
        ),
        M.bind("runtime", () => M.runtime<R>()),
        M.tap(({ output, runtime }) =>
          T.toManaged(
            register(
              toAsyncEmit((k) => {
                try {
                  runtime.run(T.chain_(Take.fromPull(k), (_) => Q.offer_(output, _)))
                } catch (e: unknown) {
                  if (CS.isFiberFailure(e)) {
                    if (!CS.interrupted(e.cause)) {
                      throw e
                    }
                  }
                }
              })
            )
          )
        ),
        M.map(({ output }) => {
          const loop: CH.Channel<
            unknown,
            unknown,
            unknown,
            unknown,
            E,
            A.Chunk<A>,
            void
          > = CH.unwrap(
            pipe(
              Q.take(output),
              T.chain((_) => Take.done(_)),
              T.foldCauseM(
                (maybeError) => {
                  return T.as_(
                    Q.shutdown(output),
                    E.fold_(
                      CS.failureOrCause(maybeError),
                      (l) =>
                        O.fold_(
                          l,
                          () => CH.end(undefined),
                          (failure) => CH.fail(failure)
                        ),
                      (cause) => CH.failCause(cause)
                    )
                  )
                },
                (a) => T.succeed(CH.zipRight_(CH.write(a), loop))
              )
            )
          )

          return loop
        })
      )
    )
  )
}

/**
 * Recovers from specified error.
 *
 * @ets_data_first catchTag_
 */
export function catchTag<
  K extends E["_tag"] & string,
  E extends { _tag: string },
  R1,
  E1,
  A1
>(k: K, f: (e: Extract<E, { _tag: K }>) => Stream<R1, E1, A1>) {
  return <R, A>(
    self: Stream<R, E, A>
  ): Stream<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> => catchTag_(self, k, f)
}

/**
 * Recovers from specified error.
 */
export function catchTag_<
  K extends E["_tag"] & string,
  E extends { _tag: string },
  R,
  A,
  R1,
  E1,
  A1
>(
  self: Stream<R, E, A>,
  k: K,
  f: (e: Extract<E, { _tag: K }>) => Stream<R1, E1, A1>
): Stream<R & R1, Exclude<E, { _tag: K }> | E1, A | A1> {
  return catchAll_(self, (e) => {
    if ("_tag" in e && e["_tag"] === k) {
      return f(e as any)
    }
    return C.fail(e as any)
  })
}
