import * as CS from "../../../Cause"
import type * as CL from "../../../Clock"
import * as A from "../../../Collections/Immutable/Chunk"
import * as L from "../../../Collections/Immutable/List"
import * as Tp from "../../../Collections/Immutable/Tuple"
import * as T from "../../../Effect"
import * as E from "../../../Either"
import * as Ex from "../../../Exit"
import * as F from "../../../Fiber"
import { pipe } from "../../../Function"
import type { Has } from "../../../Has"
import * as H from "../../../Hub"
import * as M from "../../../Managed"
import * as O from "../../../Option"
import * as Q from "../../../Queue"
import * as Ref from "../../../Ref"
import * as SC from "../../../Schedule"
import * as C from "../_internal/core"
import * as CH from "../Channel"
import type * as SK from "../Sink"
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
export function runIntoHubManaged_<R, R1, E extends E1, E1, A>(
  self: Stream<R, E, A>,
  hub: H.XHub<R1, never, never, unknown, Take.Take<E1, A>, any>
): M.Managed<R & R1, E | E1, void> {
  return runIntoManaged_(self, H.toQueue(hub))
}

/**
 * Like `Stream#runIntoHub`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoHubManaged<R1, E1, A>(
  hub: H.XHub<R1, never, never, unknown, Take.Take<E1, A>, any>
) {
  return <R, E extends E1>(self: Stream<R, E, A>) => runIntoHubManaged_(self, hub)
}

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoManaged_<R, R1, E extends E1, E1, A>(
  self: Stream<R, E, A>,
  queue: Q.XQueue<R1, never, never, unknown, Take.Take<E1, A>, any>
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
export function runIntoManaged<R1, E1, A>(
  queue: Q.XQueue<R1, never, never, unknown, Take.Take<E1, A>, any>
) {
  return <R, E extends E1>(self: Stream<R, E, A>) => runIntoManaged_(self, queue)
}

/**
 * Unwraps `Exit` values that also signify end-of-stream by failing with `None`.
 *
 * For `Exit<E, A>` values that do not signal end-of-stream, prefer:
 * {{{
 * mapM(stream, _ => T.done(_))
 * }}}
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
 * Submerges the chunks carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenChunks<R, E, A>(
  self: Stream<R, E, A.Chunk<A>>
): Stream<R, E, A> {
  return new Stream(CH.mapOut_(self.channel, A.flatten))
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
