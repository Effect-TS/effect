import * as CS from "../../../Cause"
import type * as CL from "../../../Clock"
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
import type { Has } from "../../../Has"
import * as H from "../../../Hub"
import * as M from "../../../Managed"
import * as O from "../../../Option"
import * as P from "../../../Promise"
import * as Q from "../../../Queue"
import * as Ref from "../../../Ref"
import * as SC from "../../../Schedule"
import * as SM from "../../../Semaphore"
import { AtomicNumber } from "../../../Support/AtomicNumber"
import * as C from "../_internal/core"
import * as CH from "../Channel"
import * as SK from "../Sink"
import * as BP from "./BufferedPull"
import { Stream } from "./core"
import * as HO from "./Handoff"
import * as Pull from "./Pull"
import * as SER from "./sinkEndReason"
import * as Take from "./Take"
import * as Z from "./zip"

/**
 * Submerges the error case of an `Either` into the `ZStream`.
 */
export function absolve<R, E, E2, A>(
  xs: Stream<R, E, E.Either<E2, A>>
): Stream<R, E | E2, A> {
  return C.mapM_(xs, (_) => T.fromEither(() => _))
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
                  return CH.halt(_.error)
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
 */
export function bimap<E, E1, A, A1>(f: (e: E) => E1, g: (a: A) => A1) {
  return <R>(self: Stream<R, E, A>) => bimap_(self, f, g)
}

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
      > = CH.chain_(
        CH.fromEffect(Q.take(queue)),
        Take.fold(
          CH.end(undefined),
          (error) => CH.halt(error),
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
 */
export function buffer(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>) => buffer_(self, capacity)
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
          (error) => CH.halt(error),
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
  return catchAllCause_(self, (_) => E.fold_(CS.failureOrCause(_), f, (_) => halt(_)))
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
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
        () => halt(e),
        (_) => _
      )
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause<R1, E, E1, A1>(
  pf: (e: CS.Cause<E>) => O.Option<Stream<R1, E1, A1>>
) {
  return <R, A>(self: Stream<R, E, A>) => catchSomeCause_(self, pf)
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
      const process: CH.Channel<R, E, A.Chunk<A>, unknown, E, A.Chunk<A>, void> =
        CH.readWithCause(
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
          (cause) => CH.zipRight_(rechunker.emitOfNotEmpty(), CH.halt(cause)),
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
export function collectM_<R, R1, E, E1, A, A1>(
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
 */
export function collectM<R1, E1, A, A1>(pf: (a: A) => O.Option<T.Effect<R1, E1, A1>>) {
  return <R, E>(self: Stream<R, E, A>) => collectM_(self, pf)
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
export function collectWhileM_<R, R1, E, E1, A, A1>(
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
 */
export function collectWhileM<R1, E1, A, A1>(
  pf: (a: A) => O.Option<T.Effect<R1, E1, A1>>
) {
  return <R, E>(self: Stream<R, E, A>) => collectWhileM_(self, pf)
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
export function combine<R, R1, E, E1, A, A2>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A2>
) {
  return <S>(s: S) =>
    <A3>(
      f: (
        s: S,
        eff1: T.Effect<R, O.Option<E>, A>,
        eff2: T.Effect<R1, O.Option<E1>, A2>
      ) => T.Effect<R1, never, Ex.Exit<O.Option<E | E1>, Tp.Tuple<[A3, S]>>>
    ): Stream<R1 & R, E | E1, A3> => {
      return C.unwrapManaged(
        pipe(
          M.do,
          M.bind("left", () => M.mapM_(C.toPull(self), BP.make)),
          M.bind("right", () => M.mapM_(C.toPull(that), BP.make)),
          M.map(({ left, right }) =>
            unfoldM(s)((s) =>
              T.chain_(f(s, BP.pullElement(left), BP.pullElement(right)), (_) =>
                T.optional(T.done(_))
              )
            )
          )
        )
      )
    }
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
 */
export function ensuring<R1, Z>(fin: T.Effect<R1, never, Z>) {
  return <R, E, A>(self: Stream<R, E, A>) => ensuring_(self, fin)
}

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
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 */
export function runReduce<R, E, A, S>(self: Stream<R, E, A>, s: S) {
  return (f: (s: S, a: A) => S): T.Effect<R, E, S> =>
    M.use_(
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
 * Executes an effectful fold over the stream of values.
 */
export function runReduceM<R, E, A, S>(self: Stream<R, E, A>, s: S) {
  return <R1, E1>(f: (s: S, a: A) => T.Effect<R1, E1, S>) =>
    M.use_(runReduceWhileManagedM(self, s)((_) => true)(f), T.succeed)
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function runReduceManaged<R, E, A, S>(self: Stream<R, E, A>, s: S) {
  return (f: (s: S, a: A) => S): M.Managed<R, E, S> =>
    runReduceWhileManaged_(
      self,
      s,
      (_) => true,
      (s, a) => f(s, a)
    )
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function runReduceManagedM<R, E, A, S>(self: Stream<R, E, A>, s: S) {
  return <R1, E1>(
    f: (s: S, a: A) => T.Effect<R1, E1, S>
  ): M.Managed<R & R1, E | E1, S> => runReduceWhileManagedM(self, s)((_) => true)(f)
}

/**
 * Reduces the elements in the stream to a value of type `S`.
 * Stops the fold early when the condition is not fulfilled.
 */
export function runReduceWhile<R, E, A, S>(self: Stream<R, E, A>, s: S) {
  return (cont: Predicate<S>) =>
    (f: (s: S, a: A) => S): T.Effect<R, E, S> =>
      M.use_(
        runReduceWhileManaged_(self, s, cont, (s, a) => f(s, a)),
        T.succeed
      )
}

/**
 * Executes an effectful fold over the stream of values.
 * Stops the fold early when the condition is not fulfilled.
 */
export function runReduceWhileM<R, E, A, S>(self: Stream<R, E, A>, s: S) {
  return (cont: Predicate<S>) =>
    <R1, E1>(f: (s: S, a: A) => T.Effect<R1, E1, S>): T.Effect<R & R1, E | E1, S> =>
      M.use_(runReduceWhileManagedM(self, s)(cont)(f), T.succeed)
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
  return runManaged_(self, SK.reduce(s)(cont)(f))
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @dataFirst runFoldWhileManaged_
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
export function runReduceWhileManagedM<R, E, A, S>(self: Stream<R, E, A>, s: S) {
  return (cont: Predicate<S>) =>
    <R1, E1>(f: (s: S, a: A) => T.Effect<R1, E1, S>) =>
      runManaged_(self, SK.reduceM(s)(cont)<R1, A, E | E1>(f))
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
 */
export function runForEachWhile<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, A>) => runForEachWhile_(self, f)
}

/**
 * Like `Stream#forEachWhile`, but returns a `ZManaged` so the finalization order
 * can be controlled.
 */
export function runForEachWhileManaged_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, boolean>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(self, SK.forEachWhile(f))
}

/**
 * Like `Stream#forEachWhile`, but returns a `ZManaged` so the finalization order
 * can be controlled.
 */
export function runForEachWhileManaged<R1, E1, A>(
  f: (a: A) => T.Effect<R1, E1, boolean>
) {
  return <R, E>(self: Stream<R, E, A>) => runForEachWhileManaged_(self, f)
}

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterM_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, A>
): Stream<R & R1, E | E1, A> {
  return C.loopOnPartialChunksElements_(self, (a, emit) =>
    T.chain_(f(a), (r) => (r ? emit(a) : T.unit))
  )
}

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterM<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, A>) {
  return <R, E>(self: Stream<R, E, A>) => filterM_(self, f)
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
export function fixed<R, E, A>(
  self: Stream<R, E, A>,
  duration: number
): Stream<R & Has<CL.Clock>, E, A> {
  return schedule_(self, SC.fixed(duration))
}

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
  return C.mapM_(self, (a) => T.done(a))
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
            (cause) => CH.halt(cause)
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
    (cause) => CH.halt(cause),
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
 */
export function mapChunks<A, A1>(f: (chunk: A.Chunk<A>) => A.Chunk<A1>) {
  return <R, E>(self: Stream<R, E, A>) => mapChunks_(self, f)
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
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <R, A>(self: Stream<R, E, A>) => mapError_(self, f)
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
  const writer: CH.Channel<R, E, A.Chunk<A>, unknown, E, Take.Take<E | E1, A>, any> =
    CH.readWithCause(
      (in_) => CH.zipRight_(CH.write(Take.chunk(in_)), writer),
      (cause) => CH.write(Take.halt(cause)),
      (_) => CH.write(Take.end)
    )

  return pipe(
    self.channel[">>>"](writer),
    CH.mapOutM((_) => Q.offer_(queue, _)),
    CH.drain,
    CH.runManaged,
    M.asUnit
  )
}

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoManaged<R1, E1, A, Z>(
  queue: Q.XQueue<R1, never, never, unknown, Take.Take<E1, A>, Z>
) {
  return <R, E extends E1>(self: Stream<R, E, A>) => runIntoManaged_(self, queue)
}

export const DEFAULT_CHUNK_SIZE = 4096

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
 */
export function toHub(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>) => toHub_(self, capacity)
}

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
            return Pull.halt(c)
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
  return unfoldChunkM(undefined)((_) => {
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
export function unfoldChunkM<S>(s: S) {
  return <R, E, A>(
    f: (s: S) => T.Effect<R, E, O.Option<Tp.Tuple<[A.Chunk<A>, S]>>>
  ): Stream<R, E, A> => {
    const loop = (s: S): CH.Channel<R, unknown, unknown, unknown, E, A.Chunk<A>, any> =>
      CH.unwrap(
        T.map_(
          f(s),
          O.fold(
            () => CH.end(undefined),
            ({ tuple: [as, s] }) => CH.zipRight_(CH.write(as), loop(s))
          )
        )
      )

    return new Stream(loop(s))
  }
}

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldM<S>(s: S) {
  return <R, E, A>(
    f: (s: S) => T.Effect<R, E, O.Option<Tp.Tuple<[A, S]>>>
  ): Stream<R, E, A> => {
    return unfoldChunkM(s)((_) =>
      T.map_(
        f(_),
        O.map(({ tuple: [a, s] }) => Tp.tuple(A.single(a), s))
      )
    )
  }
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
 */
export function toQueue(capacity = 2) {
  return <R, E, A>(self: Stream<R, E, A>) => toQueue_(self, capacity)
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
 * The stream that always halts with `cause`.
 */
export function halt<E>(cause: CS.Cause<E>): Stream<unknown, E, never> {
  return fromEffect(T.halt(cause))
}

/**
 * Creates a stream from a subscription to a hub.
 */
export function fromHub<R, E, A>(
  hub: H.XHub<never, R, unknown, E, never, A>
): Stream<R, E, A> {
  return C.chain_(C.managed(H.subscribe(hub)), fromQueue())
}

export function runManaged_<R, R1, E, A, E2, B, L>(
  self: Stream<R, E, A>,
  sink: SK.Sink<R1, E, A, E2, L, B>
): M.Managed<R & R1, E2, B> {
  return pipe(CH.pipeTo_(self.channel, sink.channel), CH.drain, CH.runManaged)
}

export function runManaged<R1, E, A, E2, B>(sink: SK.Sink<R1, E, A, E2, any, B>) {
  return <R>(self: Stream<R, E, A>) => runManaged_(self, sink)
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
 */
export function interruptWhenP<E1>(p: P.Promise<E1, never>) {
  return <R, E, A>(self: Stream<R, E, A>) => interruptWhenP_(self, p)
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule_<R, R1, E, A, Z>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, Z>
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
 */
export function schedule<R1, A, Z>(schedule: SC.Schedule<R1, A, Z>) {
  return <R, E>(self: Stream<R, E, A>) => schedule_(self, schedule)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither_<R, R1, E, A, B>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>
): Stream<R & Has<CL.Clock> & R1, E, E.Either<B, A>> {
  return scheduleWith(self, schedule)(
    (r) => E.right(r),
    (l) => E.left(l)
  )
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither<R1, A, B>(schedule: SC.Schedule<R1, A, B>) {
  return <R, E>(self: Stream<R, E, A>) => scheduleEither_(self, schedule)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 */
export function scheduleWith<R, R1, E, A, B>(
  self: Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>
) {
  return <C1, C2>(
    f: (a: A) => C1,
    g: (b: B) => C2
  ): Stream<R & Has<CL.Clock> & R1, E, C1 | C2> =>
    C.unwrap(
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
